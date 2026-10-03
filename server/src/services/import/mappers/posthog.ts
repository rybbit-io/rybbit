import { DateTime } from "luxon";
import { z } from "zod";
import { getDeviceType } from "../../../utils.js";
import { getChannel } from "../../tracker/getChannel.js";
import { clearSelfReferrer, getAllUrlParams, parseUserAgent } from "../../tracker/utils.js";
import { RybbitEvent } from "./rybbit.js";
import { deriveKeyOnlySchema } from "./utils.js";

export type PostHogEvent = z.input<typeof PostHogImportMapper.postHogEventKeyOnlySchema>;

// PostHog's SQL export writes timestamps in the project's time zone, as in
// "2024-08-17 05:19:58.284000+00:00"; ISO 8601 with a T is accepted too
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}(:?\d{2})?)?$/;

// posthog-js adds these next to the developer's own properties on every event,
// so they aren't custom event properties. The campaign parameters persist from
// the landing page, whose URL already carries them into Rybbit.
const SDK_PROPERTIES = new Set([
  "token",
  "distinct_id",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gad_source",
  "mc_cid",
  "gclid",
  "gclsrc",
  "dclid",
  "gbraid",
  "wbraid",
  "fbclid",
  "msclkid",
  "twclid",
  "li_fat_id",
  "igshid",
  "ttclid",
  "rdt_cid",
  "epik",
  "qclid",
  "sccid",
  "oppref",
  "irclid",
  "_kx",
]);

// Descriptive properties blank out instead of failing: an event shouldn't be
// dropped because PostHog couldn't detect a screen size or locate the visitor.
const optionalText = (maxLength: number) =>
  z
    .string()
    .catch("")
    .transform(value => (value.length <= maxLength ? value : ""));

const mappedName = (map: Record<string, string>, maxLength: number) =>
  z
    .string()
    .catch("")
    .transform(value => {
      const mapped = map[value.toLowerCase()] ?? value;
      return mapped.length <= maxLength ? mapped : "";
    });

// screen_width and screen_height are UInt16 columns
const dimension = z.number().int().min(0).max(65535).catch(0);

const webVital = z.number().finite().nonnegative().nullable().catch(null);

const exceptionSchema = z.object({
  type: z.string().catch(""),
  value: z.string().catch(""),
  stacktrace: z.object({ frames: z.array(z.record(z.unknown())).catch([]) }).catch({ frames: [] }),
});

type StackFrame = { name: string; fileName: string; lineNumber?: number; columnNumber?: number };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stringValue = (value: unknown) => (typeof value === "string" ? value : "");

const positiveInteger = (value: unknown) =>
  typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;

export class PostHogImportMapper {
  // Names posthog-js gives browsers, for events without a raw user agent to
  // parse; the rest already match Rybbit's
  private static readonly browserMap: Record<string, string> = {
    "chrome ios": "Mobile Chrome",
    "firefox ios": "Mobile Firefox",
    "microsoft edge": "Edge",
    "facebook mobile": "Facebook",
    "android mobile": "Android Browser",
    "internet explorer": "IE",
    "internet explorer mobile": "IEMobile",
    "uc browser": "UCBrowser",
    "pale moon": "PaleMoon",
    "google search app": "GSA",
  };

  private static readonly osMap: Record<string, string> = {
    "mac os x": "macOS",
  };

  // Rybbit's tracker counts tablets and watches as mobile
  private static readonly deviceMap: Record<string, string> = {
    desktop: "Desktop",
    mobile: "Mobile",
    tablet: "Mobile",
    wearable: "Mobile",
    console: "Console",
  };

  private static readonly propertiesSchema = z.object({
    $session_id: optionalText(255),
    $device_id: optionalText(255),
    $is_identified: z.boolean().catch(false),

    $current_url: optionalText(2048),
    // posthog-js only sets the page title on pageviews
    title: z
      .string()
      .catch("")
      .transform(title => title.slice(0, 512)),
    // "$direct" is PostHog's marker for a visit without a referrer
    $referrer: optionalText(2048).transform(referrer => (referrer === "$direct" ? "" : referrer)),

    // posthog-js truncates the user agent to 1000 characters
    $raw_user_agent: optionalText(1000),
    $browser: mappedName(PostHogImportMapper.browserMap, 30),
    // Rybbit's tracker stores only the major version
    $browser_version: z
      .union([z.number(), z.string()])
      .catch("")
      .transform(version => String(version).match(/^\d+/)?.[0] ?? ""),
    $os: mappedName(PostHogImportMapper.osMap, 25),
    $os_version: optionalText(20),
    $device_type: mappedName(PostHogImportMapper.deviceMap, 20),
    $screen_width: dimension,
    $screen_height: dimension,
    $browser_language: optionalText(35),

    $geoip_country_code: z
      .string()
      .catch("")
      .transform(code => (/^[A-Z]{2}$/i.test(code) ? code.toUpperCase() : "")),
    $geoip_subdivision_1_code: z
      .string()
      .catch("")
      .transform(code => (/^[A-Z0-9]{1,3}$/i.test(code) ? code.toUpperCase() : "")),
    $geoip_city_name: optionalText(60),
    $geoip_latitude: z.number().min(-90).max(90).catch(0),
    $geoip_longitude: z.number().min(-180).max(180).catch(0),
    $geoip_time_zone: z
      .string()
      .catch("")
      .transform(zone => (zone.length <= 64 && /^[A-Za-z][\w+-]*(\/[\w+-]+)*$/.test(zone) ? zone : "")),

    // The link's target when an autocaptured click leaves the site
    $external_click_url: optionalText(2048),
    $el_text: z.string().catch(""),

    $web_vitals_LCP_value: webVital,
    $web_vitals_CLS_value: webVital,
    $web_vitals_INP_value: webVital,
    $web_vitals_FCP_value: webVital,

    $exception_list: z.array(exceptionSchema).catch([]),
    // Sent by posthog-js versions older than $exception_list
    $exception_type: z.string().catch(""),
    $exception_message: z.string().catch(""),
  });

  private static readonly postHogEventSchema = z.object({
    event: z.string().min(1),
    timestamp: z
      .string()
      .regex(TIMESTAMP_PATTERN)
      .transform((value, ctx) => {
        const timestamp = DateTime.fromISO(value.replace(" ", "T"), { zone: "utc" });
        if (!timestamp.isValid) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid timestamp" });
          return z.NEVER;
        }
        return timestamp.toUTC();
      }),
    distinct_id: z.string().min(1).max(255),
    // Empty when the export has no $session_id column; the property is used instead
    $session_id: z.string().max(255),
    properties: z.string().transform((value, ctx) => {
      try {
        const properties: unknown = JSON.parse(value);
        if (isRecord(properties)) {
          return properties;
        }
      } catch {
        // Reported below
      }
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Properties must be a JSON object" });
      return z.NEVER;
    }),
  });

  static readonly postHogEventKeyOnlySchema = deriveKeyOnlySchema(PostHogImportMapper.postHogEventSchema);

  private static parseUrl(url: string): { hostname: string; pathname: string; querystring: string } | null {
    if (!url) {
      return null;
    }

    try {
      const urlObj = new URL(url);
      return {
        hostname: urlObj.hostname,
        // Rybbit's tracker reads hash-routed paths such as /#/settings from the hash
        pathname: urlObj.hash.startsWith("#/") ? urlObj.hash.substring(1) : urlObj.pathname,
        querystring: urlObj.search,
      };
    } catch {
      return null;
    }
  }

  // posthog-js sends raw frames. When PostHog resolves a frame it renames the
  // fields and keeps the raw frame, whose URL matches what Rybbit's tracker
  // records, in junk_drawer.
  private static parseFrame(frame: Record<string, unknown>): StackFrame {
    const raw =
      isRecord(frame.junk_drawer) && isRecord(frame.junk_drawer.raw_frame) ? frame.junk_drawer.raw_frame : frame;
    return {
      name: stringValue(raw.function) || stringValue(frame.resolved_name) || stringValue(frame.mangled_name),
      fileName: stringValue(raw.filename) || stringValue(frame.source),
      lineNumber: positiveInteger(raw.lineno) ?? positiveInteger(frame.line),
      columnNumber: positiveInteger(raw.colno) ?? positiveInteger(frame.column),
    };
  }

  // Rebuilds the error the way Rybbit's tracker reports it: the error's type
  // names the event, and the message, stack and throwing location are properties
  private static mapException(
    properties: z.output<typeof PostHogImportMapper.propertiesSchema>
  ): Pick<RybbitEvent, "type" | "event_name" | "props"> {
    const [exception] = properties.$exception_list;
    const type = (exception?.type || properties.$exception_type || "Error").slice(0, 256);
    const message = (exception?.value || properties.$exception_message || "Unknown error").slice(0, 500);

    // PostHog orders frames from the outermost call in, but a JavaScript stack
    // starts where the error was thrown
    const frames = (exception?.stacktrace.frames ?? []).map(PostHogImportMapper.parseFrame).reverse();
    const lines = frames.map(({ name, fileName, lineNumber, columnNumber }) => {
      let location = fileName || "<anonymous>";
      if (lineNumber) {
        location += columnNumber ? `:${lineNumber}:${columnNumber}` : `:${lineNumber}`;
      }
      return name ? `    at ${name} (${location})` : `    at ${location}`;
    });

    const props: Record<string, unknown> = {
      message,
      stack: lines.length > 0 ? [`${type}: ${message}`, ...lines].join("\n").slice(0, 2000) : "",
    };
    const [thrownAt] = frames;
    if (thrownAt?.fileName) {
      props.fileName = thrownAt.fileName;
    }
    if (thrownAt?.lineNumber) {
      props.lineNumber = thrownAt.lineNumber;
    }
    if (thrownAt?.columnNumber) {
      props.columnNumber = thrownAt.columnNumber;
    }

    return { type: "error", event_name: type, props };
  }

  private static mapEvent(
    event: string,
    properties: z.output<typeof PostHogImportMapper.propertiesSchema>,
    rawProperties: Record<string, unknown>
  ): Pick<RybbitEvent, "type" | "event_name" | "props" | "lcp" | "cls" | "inp" | "fcp"> | null {
    switch (event) {
      case "$pageview":
        return { type: "pageview", event_name: "", props: {} };
      // Only clicks that leave the site have a Rybbit equivalent
      case "$autocapture": {
        const url = properties.$external_click_url;
        if (!url || !URL.canParse(url)) {
          return null;
        }
        return {
          type: "outbound",
          event_name: "",
          props: properties.$el_text ? { url, text: properties.$el_text } : { url },
        };
      }
      // posthog-js can split one page's web vitals across several events, and
      // each becomes a performance event with the metrics it carries
      case "$web_vitals": {
        const vitals = {
          lcp: properties.$web_vitals_LCP_value,
          cls: properties.$web_vitals_CLS_value,
          inp: properties.$web_vitals_INP_value,
          fcp: properties.$web_vitals_FCP_value,
        };
        if (Object.values(vitals).every(value => value === null)) {
          return null;
        }
        return { type: "performance", event_name: "web-vitals", props: {}, ...vitals };
      }
      case "$exception":
        return PostHogImportMapper.mapException(properties);
      default: {
        // PostHog's own events start with $; those without an equivalent above,
        // such as $pageleave or $rageclick, are skipped
        if (event.startsWith("$")) {
          return null;
        }

        const props = Object.fromEntries(
          Object.entries(rawProperties).filter(([key]) => !key.startsWith("$") && !SDK_PROPERTIES.has(key))
        );
        return { type: "custom_event", event_name: event.slice(0, 256), props };
      }
    }
  }

  static transform(events: PostHogEvent[], site: number, importId: string): RybbitEvent[] {
    return events.reduce<RybbitEvent[]>((acc, event) => {
      const parsed = PostHogImportMapper.postHogEventSchema.safeParse(event);
      if (!parsed.success) {
        return acc;
      }

      const data = parsed.data;
      const properties = PostHogImportMapper.propertiesSchema.parse(data.properties);
      // Server-side SDKs send events without a session, which Rybbit can't place
      const sessionId = data.$session_id || properties.$session_id;
      const action = PostHogImportMapper.mapEvent(data.event, properties, data.properties);
      const page = PostHogImportMapper.parseUrl(properties.$current_url);
      if (!sessionId || !action || (action.type === "pageview" && !page)) {
        return acc;
      }

      const hostname = page?.hostname ?? "";
      const querystring = page?.querystring ?? "";
      const referrer = clearSelfReferrer(properties.$referrer, hostname);
      const screenWidth = properties.$screen_width;
      const screenHeight = properties.$screen_height;

      // Parse the user agent the way Rybbit's tracker does, so imported
      // browsers and devices match natively tracked ones. Older posthog-js
      // versions don't send it, which leaves PostHog's own detection.
      const ua = properties.$raw_user_agent ? parseUserAgent(properties.$raw_user_agent) : null;
      const device = ua
        ? {
            browser: ua.browser.name || "",
            browser_version: ua.browser.major || "",
            operating_system: ua.os.name || "",
            operating_system_version: ua.os.version || "",
            device_type: getDeviceType(screenWidth, screenHeight, ua),
          }
        : {
            browser: properties.$browser,
            browser_version: properties.$browser_version,
            operating_system: properties.$os,
            operating_system_version: properties.$os_version,
            device_type: properties.$device_type,
          };

      const country = properties.$geoip_country_code;
      const subdivision = properties.$geoip_subdivision_1_code;

      acc.push({
        site_id: site,
        timestamp: data.timestamp.toFormat("yyyy-MM-dd HH:mm:ss"),
        // Keeps events that share a second in order
        timestamp_ms: data.timestamp.toFormat("yyyy-MM-dd HH:mm:ss.SSS"),
        session_id: sessionId,
        // $device_id stays the same when posthog.identify() swaps the distinct ID
        // for the person's own ID, so it's the anonymous device like Rybbit's user ID
        user_id: properties.$device_id || data.distinct_id,
        identified_user_id: properties.$is_identified ? data.distinct_id : "",
        hostname,
        pathname: page?.pathname ?? "",
        querystring,
        url_parameters: getAllUrlParams(querystring),
        page_title: data.event === "$pageview" ? properties.title : "",
        referrer,
        channel: getChannel(referrer, querystring, hostname),
        ...device,
        language: properties.$browser_language,
        country,
        region: country && subdivision ? `${country}-${subdivision}` : "",
        city: properties.$geoip_city_name,
        lat: properties.$geoip_latitude,
        lon: properties.$geoip_longitude,
        timezone: properties.$geoip_time_zone,
        screen_width: screenWidth,
        screen_height: screenHeight,
        ...action,
        import_id: importId,
      });

      return acc;
    }, []);
  }
}
