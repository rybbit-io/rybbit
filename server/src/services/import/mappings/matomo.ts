import { clearSelfReferrer, getAllUrlParams } from "../../tracker/utils.js";
import { getChannel } from "../../tracker/getChannel.js";
import { RybbitEvent } from "./rybbit.js";
import { z } from "zod";
import { DateTime } from "luxon";
import { deriveKeyOnlySchema } from "./utils.js";

export type MatomoEvent = z.input<typeof MatomoImportMapper.matomoEventKeyOnlySchema>;

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
  };

  private static readonly browserSchema = z
    .string()
    .max(30)
    .transform(browser => {
      const key = browser.toLowerCase();
      return MatomoImportMapper.browserMap[key] ?? browser;
    });

  private static readonly osMap: Record<string, string> = {
    mac: "macOS",
    "gnu/linux": "Linux",
    "chromium os": "Chrome OS",
    "windows mobile": "Windows Phone",
  };

  private static readonly osSchema = z
    .string()
    .max(25)
    .transform(os => {
      const key = os.toLowerCase();
      return MatomoImportMapper.osMap[key] ?? os;
    });

  private static readonly deviceMap: Record<string, string> = {
    desktop: "Desktop",
    smartphone: "Mobile",
    phablet: "Mobile",
    tablet: "Mobile",
  };

  private static readonly deviceSchema = z
    .string()
    .max(20)
    .transform(device => {
      const key = device.toLowerCase();
      return MatomoImportMapper.deviceMap[key] ?? device;
    });

  private static parseUrl(url: string): { pathname: string; querystring: string } {
    try {
      const urlObj = new URL(url);
      return {
        pathname: urlObj.pathname,
        querystring: urlObj.search,
      };
    } catch {
      return { pathname: "", querystring: "" };
    }
  }

  private static readonly matomoEventSchema = z.object({
    visitorId: z.string().max(64), // fix
    fingerprint: z.string().max(64), // fix
    siteName: z.string().max(253),

    type: z.enum(["action", "outlink"]),
    url: z.string().min(1).max(2048),
    pageTitle: z.string().max(512),
    timestamp: z.string().regex(/^\d+$/),

    referrerUrl: z.string().max(253 + 2048),

    browserName: MatomoImportMapper.browserSchema,
    browserVersion: z.string().max(20),
    operatingSystemName: MatomoImportMapper.osSchema,
    operatingSystemVersion: z.string().max(20),
    deviceType: MatomoImportMapper.deviceSchema,

    languageCode: z
      .string()
      .regex(/^([a-z]{2})(-[a-z]{2})?$/)
      .transform(val => {
        const [lang, region] = val.split("-");
        if (region) {
          return `${lang}-${region.toUpperCase()}`;
        }
        return lang;
      })
      .or(z.literal("")),
    countryCode: z
      .string()
      .regex(/^[a-z]{2}$/)
      .or(z.literal(""))
      .transform(code => code.toUpperCase()),
    regionCode: z
      .string()
      .regex(/^[A-Z0-9]{1,3}$/)
      .or(z.literal("")),
    city: z.string().max(60),
    latitude: z
      .string()
      .regex(/^-?\d+(\.\d+)?$/)
      .or(z.literal("")),
    longitude: z
      .string()
      .regex(/^-?\d+(\.\d+)?$/)
      .or(z.literal("")),
    resolution: z
      .string()
      .regex(/^\d{1,5}x\d{1,5}$/)
      .or(z.literal("")),
  });

  static readonly matomoEventKeyOnlySchema = deriveKeyOnlySchema(MatomoImportMapper.matomoEventSchema);

  static transform(events: any[], site: number, importId: string): RybbitEvent[] {
    return events.reduce<RybbitEvent[]>((acc, event) => {
      const parsed = MatomoImportMapper.matomoEventSchema.safeParse(event);
      if (!parsed.success) {
        return acc;
      }

      const data = parsed.data;
      const { pathname, querystring } = MatomoImportMapper.parseUrl(data.url);
      const referrer = clearSelfReferrer(data.referrerUrl, data.siteName);
      const [screenWidth, screenHeight] = data.resolution ? data.resolution.split("x") : ["0", "0"];

      acc.push({
        site_id: site,
        timestamp: DateTime.fromSeconds(parseInt(data.timestamp, 10)).toFormat("yyyy-MM-dd HH:mm:ss"),
        session_id: data.fingerprint,
        user_id: data.visitorId,
        hostname: data.siteName,
        pathname: pathname,
        querystring: querystring,
        url_parameters: getAllUrlParams(querystring),
        page_title: data.pageTitle,
        referrer: referrer,
        channel: getChannel(referrer, querystring, data.siteName),
        browser: data.browserName,
        browser_version: data.browserVersion,
        operating_system: data.operatingSystemName,
        operating_system_version: data.operatingSystemVersion,
        language: data.languageCode,
        country: data.countryCode,
        region: data.countryCode && data.regionCode ? data.countryCode + "-" + data.regionCode : "",
        city: data.city,
        lat: data.latitude ? parseFloat(data.latitude) : 0,
        lon: data.longitude ? parseFloat(data.longitude) : 0,
        screen_width: parseInt(screenWidth, 10),
        screen_height: parseInt(screenHeight, 10),
        device_type: data.deviceType,
        type: data.type === "action" ? "pageview" : "outbound_link",
        event_name: "",
        props: {},
        import_id: importId,
      });

      return acc;
    }, []);
  }
}
