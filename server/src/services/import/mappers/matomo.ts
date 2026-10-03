import { clearSelfReferrer, getAllUrlParams } from "../../tracker/utils.js";
import { getChannel } from "../../tracker/getChannel.js";
import { RybbitEvent } from "./rybbit.js";
import { z } from "zod";
import { DateTime } from "luxon";
import { deriveKeyOnlySchema } from "./utils.js";

export type MatomoEvent = z.input<typeof MatomoImportMapper.matomoEventKeyOnlySchema>;

// Descriptive fields blank out instead of failing: an action shouldn't be
// dropped because Matomo couldn't detect a screen size or locate the visitor.
const blankUnless = (pattern: RegExp) => z.string().transform(value => (pattern.test(value) ? value : ""));

const maxLengthOrBlank = (maxLength: number) => z.string().transform(value => (value.length <= maxLength ? value : ""));

const mappedName = (map: Record<string, string>, maxLength: number) =>
  z.string().transform(value => {
    const mapped = map[value.toLowerCase()] ?? value;
    return mapped.length <= maxLength ? mapped : "";
  });

export class MatomoImportMapper {
  private static readonly browserMap: Record<string, string> = {
    "chrome mobile": "Mobile Chrome",
    "chrome mobile ios": "Mobile Chrome",
    "chrome webview": "Chrome WebView",
    "headless chrome": "Chrome Headless",
    "firefox mobile": "Mobile Firefox",
    "firefox mobile ios": "Mobile Firefox",
    "microsoft edge": "Edge",
    "opera mobile": "Opera",
    "opera gx": "Opera GX",
    "google search app": "GSA",
    "samsung browser": "Samsung Internet",
    "yandex browser": "Yandex",
    "qq browser": "QQBrowser",
    "whale browser": "Whale",
    "mi browser": "MIUI Browser",
    "avg secure browser": "AVG Secure Browser",
    unknown: "",
  };

  private static readonly osMap: Record<string, string> = {
    mac: "macOS",
    "gnu/linux": "Linux",
    "chromium os": "Chrome OS",
    "windows mobile": "Windows Phone",
    unknown: "",
  };

  // Collapsed onto the device types Rybbit's tracker produces, which counts
  // tablets as mobile
  private static readonly deviceMap: Record<string, string> = {
    desktop: "Desktop",
    smartphone: "Mobile",
    phablet: "Mobile",
    tablet: "Mobile",
    "feature phone": "Mobile",
    "portable media player": "Mobile",
    wearable: "Mobile",
    console: "Console",
    tv: "TV",
    "car browser": "Embedded",
    camera: "Embedded",
    peripheral: "Embedded",
    "smart display": "Embedded",
    "smart speaker": "Embedded",
    unknown: "",
  };

  private static readonly matomoEventSchema = z.object({
    // The client substitutes visitorId plus the visit's first timestamp when
    // the export has no idVisit column
    idVisit: z.string().min(1).max(64),
    visitorId: z.string().regex(/^[0-9a-f]{16}$/i),
    userId: z.string().transform(userId => {
      const trimmed = userId.trim();
      return trimmed.length <= 255 ? trimmed : "";
    }),

    type: z.enum(["action", "search", "outlink", "download", "event"]),
    // The page the action happened on; empty for an outlink, download or event
    // that came before any pageview in the visit
    url: z.string().max(2048),
    pageTitle: z.string().transform(title => title.slice(0, 512)),
    // Target of an outlink or download
    linkUrl: z.string().max(2048),
    eventCategory: z.string(),
    eventAction: z.string(),
    eventName: z.string(),
    eventValue: blankUnless(/^-?\d+(\.\d+)?$/),
    timestamp: z.string().regex(/^\d+$/),

    referrerUrl: maxLengthOrBlank(2048),

    browserName: mappedName(MatomoImportMapper.browserMap, 30),
    // Rybbit's tracker stores only the major version
    browserVersion: z.string().transform(version => version.match(/^\d+/)?.[0] ?? ""),
    operatingSystemName: mappedName(MatomoImportMapper.osMap, 25),
    operatingSystemVersion: maxLengthOrBlank(20),
    deviceType: mappedName(MatomoImportMapper.deviceMap, 20),

    // Matomo reports "en-us"; Rybbit stores the browser's casing, "en-US"
    languageCode: z.string().transform(code => {
      const match = code.match(/^([a-z]{2,3})(?:-([a-z]{2}|\d{3}))?$/i);
      if (!match || match[1].toLowerCase() === "xx") {
        return "";
      }
      const language = match[1].toLowerCase();
      return match[2] ? `${language}-${match[2].toUpperCase()}` : language;
    }),
    // "xx" is Matomo's marker for a visitor it couldn't locate
    countryCode: z.string().transform(code => {
      const upper = code.toUpperCase();
      return /^[A-Z]{2}$/.test(upper) && upper !== "XX" ? upper : "";
    }),
    regionCode: z.string().transform(code => {
      const upper = code.toUpperCase();
      return /^[A-Z0-9]{1,3}$/.test(upper) ? upper : "";
    }),
    city: maxLengthOrBlank(60),
    latitude: blankUnless(/^-?\d+(\.\d+)?$/),
    longitude: blankUnless(/^-?\d+(\.\d+)?$/),
    // Matomo reports "unknown" when the tracker sent no resolution
    resolution: z.string().transform(resolution => {
      const match = resolution.match(/^(\d{1,5})x(\d{1,5})$/);
      const width = match ? parseInt(match[1], 10) : 0;
      const height = match ? parseInt(match[2], 10) : 0;
      // screen_width and screen_height are UInt16 columns
      return width <= 65535 && height <= 65535 ? { width, height } : { width: 0, height: 0 };
    }),
  });

  static readonly matomoEventKeyOnlySchema = deriveKeyOnlySchema(MatomoImportMapper.matomoEventSchema);

  private static parseUrl(url: string): { hostname: string; pathname: string; querystring: string } | null {
    if (!url) {
      return null;
    }

    try {
      const urlObj = new URL(url);
      return {
        hostname: urlObj.hostname,
        pathname: urlObj.pathname,
        querystring: urlObj.search,
      };
    } catch {
      return null;
    }
  }

  private static mapAction(
    data: z.output<typeof MatomoImportMapper.matomoEventSchema>
  ): Pick<RybbitEvent, "type" | "event_name" | "props"> | null {
    switch (data.type) {
      // A site search is a pageview Matomo recognized by its search parameter
      case "action":
      case "search":
        return { type: "pageview", event_name: "", props: {} };
      case "outlink":
        return data.linkUrl ? { type: "outbound", event_name: "", props: { url: data.linkUrl } } : null;
      // Rybbit has no download type; Plausible's downloads import under this name
      case "download":
        return data.linkUrl
          ? { type: "custom_event", event_name: "File Download", props: { url: data.linkUrl } }
          : null;
      // Matomo groups events by category, so the category names the event and
      // the action, name and value become properties
      case "event": {
        const eventName = data.eventCategory || data.eventAction;
        if (!eventName) {
          return null;
        }

        const props: Record<string, unknown> = {};
        if (data.eventCategory && data.eventAction) {
          props.action = data.eventAction;
        }
        if (data.eventName) {
          props.name = data.eventName;
        }
        if (data.eventValue) {
          props.value = parseFloat(data.eventValue);
        }
        return { type: "custom_event", event_name: eventName.slice(0, 256), props };
      }
    }
  }

  static transform(events: MatomoEvent[], site: number, importId: string): RybbitEvent[] {
    return events.reduce<RybbitEvent[]>((acc, event) => {
      const parsed = MatomoImportMapper.matomoEventSchema.safeParse(event);
      if (!parsed.success) {
        return acc;
      }

      const data = parsed.data;
      const action = MatomoImportMapper.mapAction(data);
      const page = MatomoImportMapper.parseUrl(data.url);
      if (!action || (action.type === "pageview" && !page)) {
        return acc;
      }

      const hostname = page?.hostname ?? "";
      const querystring = page?.querystring ?? "";
      const referrer = clearSelfReferrer(data.referrerUrl, hostname);

      acc.push({
        site_id: site,
        timestamp: DateTime.fromSeconds(parseInt(data.timestamp, 10), { zone: "utc" }).toFormat("yyyy-MM-dd HH:mm:ss"),
        session_id: data.idVisit,
        user_id: data.visitorId,
        identified_user_id: data.userId,
        hostname: hostname,
        pathname: page?.pathname ?? "",
        querystring: querystring,
        url_parameters: getAllUrlParams(querystring),
        page_title: data.pageTitle,
        referrer: referrer,
        channel: getChannel(referrer, querystring, hostname),
        browser: data.browserName,
        browser_version: data.browserVersion,
        operating_system: data.operatingSystemName,
        operating_system_version: data.operatingSystemVersion,
        language: data.languageCode,
        country: data.countryCode,
        region: data.countryCode && data.regionCode ? `${data.countryCode}-${data.regionCode}` : "",
        city: data.city,
        lat: data.latitude ? parseFloat(data.latitude) : 0,
        lon: data.longitude ? parseFloat(data.longitude) : 0,
        screen_width: data.resolution.width,
        screen_height: data.resolution.height,
        device_type: data.deviceType,
        ...action,
        import_id: importId,
      });

      return acc;
    }, []);
  }
}
