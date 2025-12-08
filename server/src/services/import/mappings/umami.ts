import { clearSelfReferrer, getAllUrlParams } from "../../tracker/utils.js";
import { getChannel } from "../../tracker/getChannel.js";
import { RybbitEvent } from "./rybbit.js";
import { z } from "zod";
import { deriveKeyOnlySchema } from "./utils.js";

export interface UmamiEvent {
  // website_id: string; // Ignore
  session_id: string;
  // visit_id: string; // Ignore
  // event_id: string; // Ignore

  hostname: string;
  browser: string;
  os: string;
  device: string;
  screen: string;
  language: string;
  country: string;
  region: string;
  city: string;

  url_path: string;
  url_query: string;
  // utm_source: string; // Ignore, part of url_query
  // utm_medium: string; // Ignore, part of url_query
  // utm_campaign: string; // Ignore, part of url_query
  // utm_content: string; // Ignore, part of url_query
  // utm_term: string; // Ignore, part of url_query
  referrer_path: string;
  // referrer_query: string; // Ignore
  referrer_domain: string;
  page_title: string;

  // gclid: string; // Ignore, part of url_query
  // fbclid: string; // Ignore, part of url_query
  // msclkid: string; // Ignore, part of url_query
  // ttclid: string; // Ignore, part of url_query
  // li_fat_id: string; // Ignore, part of url_query
  // twclid: string; // Ignore, part of url_query

  event_type: string;
  event_name: string;
  // tag: string; // Ignore
  distinct_id: string;
  created_at: string;
  // job_id: string | null; // Ignore
}

export class UmamiImportMapper {
  private static readonly browserMap: Record<string, string> = {
    chrome: "Chrome",
    opera: "Opera",
    crios: "Mobile Chrome",
    firefox: "Firefox",
    facebook: "Facebook",
    safari: "Safari",
    ios: "Mobile Safari",
    "ios-webview": "Mobile Safari",
    "edge-chromium": "Edge",
    samsung: "Samsung Internet",
    yandexbrowser: "Yandex",
    "edge-ios": "Edge",
    "chromium-webview": "Chrome WebView",
    fxios: "Mobile Firefox",
    edge: "Edge",
  };

  private static readonly browserSchema = z
    .string()
    .max(30)
    .transform(browser => {
      const key = browser.toLowerCase();
      return UmamiImportMapper.browserMap[key] ?? browser;
    });

  private static readonly osMap: Record<string, string> = {
    "windows 10": "Windows",
    "windows 7": "Windows",
    "windows server 2003": "Windows",
    "mac os": "macOS",
    ios: "iOS",
    "android os": "Android",
    linux: "Linux",
    "chrome os": "Chrome OS",
  };

  private static readonly osSchema = z
    .string()
    .max(25)
    .transform(os => {
      const key = os.toLowerCase();
      return UmamiImportMapper.osMap[key] ?? os;
    });

  private static readonly deviceMap: Record<string, "Desktop" | "Mobile"> = {
    laptop: "Desktop",
    desktop: "Desktop",
    mobile: "Mobile",
    tablet: "Mobile",
  };

  private static readonly deviceSchema = z
    .string()
    .max(20)
    .transform(device => {
      const key = device.toLowerCase();
      return UmamiImportMapper.deviceMap[key] ?? device;
    });

  private static readonly umamiEventSchema = z.object({
    session_id: z.string().uuid(),

    hostname: z.string().max(253),
    browser: UmamiImportMapper.browserSchema,
    os: UmamiImportMapper.osSchema,
    device: UmamiImportMapper.deviceSchema,
    screen: z
      .string()
      .regex(/^\d{1,5}x\d{1,5}$/)
      .or(z.literal("")),
    language: z.string().max(35),
    country: z
      .string()
      .regex(/^[A-Z]{2}$/)
      .or(z.literal("")),
    region: z
      .string()
      .regex(/^[A-Z]{2}-[A-Z0-9]{1,3}$/)
      .or(z.literal("")),
    city: z.string().max(60),

    url_path: z.string().max(2048),
    url_query: z
      .string()
      .max(2048)
      .transform(querystring => (querystring ? `?${querystring}` : "")),
    referrer_path: z.string().max(2048),
    referrer_domain: z
      .string()
      .max(253)
      .transform(url => (url ? `https://${url}` : "")),
    page_title: z.string().max(512),

    event_type: z.enum(["1", "2"]),
    event_name: z.string().max(256),
    distinct_id: z.string().max(64),
    created_at: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]) ([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/),
  });

  static readonly umamiEventKeyOnlySchema = deriveKeyOnlySchema(UmamiImportMapper.umamiEventSchema);

  static transform(events: UmamiEvent[], site: number, importId: string): RybbitEvent[] {
    return events.reduce<RybbitEvent[]>((acc, event) => {
      const parsed = UmamiImportMapper.umamiEventSchema.safeParse(event);
      if (!parsed.success) {
        return acc;
      }

      const data = parsed.data;
      const referrer = data.referrer_domain + data.referrer_path;
      const [screenWidth, screenHeight] = data.screen ? data.screen.split("x") : ["0", "0"];

      acc.push({
        site_id: site,
        timestamp: data.created_at,
        session_id: data.session_id,
        user_id: data.distinct_id,
        hostname: data.hostname,
        pathname: data.url_path,
        querystring: data.url_query,
        url_parameters: getAllUrlParams(data.url_query),
        page_title: data.page_title,
        referrer: clearSelfReferrer(referrer, data.hostname.replace(/^www\./, "")),
        channel: getChannel(referrer, data.url_query, data.hostname),
        browser: data.browser,
        browser_version: "",
        operating_system: data.os,
        operating_system_version: event.os === "Windows 10" ? "10" : event.os === "Windows 7" ? "7" : "",
        language: data.language,
        country: data.country,
        region: data.region,
        city: data.city,
        lat: 0,
        lon: 0,
        screen_width: parseInt(screenWidth, 10),
        screen_height: parseInt(screenHeight, 10),
        device_type: data.device,
        type: data.event_type === "1" ? "pageview" : "custom_event",
        event_name: data.event_type === "1" ? "" : data.event_name,
        props: {},
        import_id: importId,
      });

      return acc;
    }, []);
  }
}
