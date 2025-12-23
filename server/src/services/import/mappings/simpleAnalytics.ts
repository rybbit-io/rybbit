import { clearSelfReferrer, getAllUrlParams } from "../../tracker/utils.js";
import { getChannel } from "../../tracker/getChannel.js";
import { RybbitEvent } from "./rybbit.js";
import { z } from "zod";
import { UAParser } from "ua-parser-js";
import { DateTime } from "luxon";
import { getDeviceType } from "../../../utils.js";
import { deriveKeyOnlySchema } from "./utils.js";

export type SimpleAnalyticsEvent = z.input<typeof SimpleAnalyticsImportMapper.simpleAnalyticsEventKeyOnlySchema>;

export class SimpleAnalyticsImportMapper {
  private static readonly simpleAnalyticsEventSchema = z.object({
    added_iso: z.string().datetime(),
    country_code: z
      .string()
      .regex(/^[A-Z]{2}$/)
      .or(z.literal("")),
    datapoint: z.string().max(256),
    document_referrer: z.string().max(253 + 2048),
    hostname: z.string().max(253),
    lang_language: z.string().max(35),
    lang_region: z.string().max(35),
    path: z.string().max(2048),
    query: z
      .string()
      .max(2048)
      .transform(querystring => (querystring ? `?${querystring}` : "")),
    screen_height: z.string().regex(/^\d+$/),
    screen_width: z.string().regex(/^\d+$/),
    session_id: z.string().uuid(),
    user_agent: z.string().max(1024),
    uuid: z.string().uuid(),
  });

  static readonly simpleAnalyticsEventKeyOnlySchema = deriveKeyOnlySchema(
    SimpleAnalyticsImportMapper.simpleAnalyticsEventSchema
  );

  static transform(events: SimpleAnalyticsEvent[], site: number, importId: string): RybbitEvent[] {
    return events.reduce<RybbitEvent[]>((acc, event) => {
      const parsed = SimpleAnalyticsImportMapper.simpleAnalyticsEventSchema.safeParse(event);
      if (!parsed.success) {
        return acc;
      }

      const data = parsed.data;
      const ua = UAParser(data.user_agent);
      const screenWidth = parseInt(data.screen_width, 10);
      const screenHeight = parseInt(data.screen_height, 10);

      acc.push({
        site_id: site,
        timestamp: DateTime.fromISO(data.added_iso).toFormat("yyyy-MM-dd HH:mm:ss"),
        session_id: data.session_id,
        user_id: data.uuid,
        hostname: data.hostname,
        pathname: data.path,
        querystring: data.query,
        url_parameters: getAllUrlParams(data.query),
        page_title: "",
        referrer: clearSelfReferrer(data.document_referrer, data.hostname),
        channel: getChannel(data.document_referrer, data.query, data.hostname),
        browser: ua.browser.name || "",
        browser_version: ua.browser.major || "",
        operating_system: ua.os.name || "",
        operating_system_version: ua.os.version || "",
        language: data.lang_region ? `${data.lang_language}-${data.lang_region.toUpperCase()}` : data.lang_language,
        country: data.country_code,
        region: "",
        city: "",
        lat: 0,
        lon: 0,
        screen_width: screenWidth,
        screen_height: screenHeight,
        device_type: getDeviceType(screenWidth, screenHeight, ua),
        type: data.datapoint === "pageview" ? "pageview" : "custom_event",
        event_name: data.datapoint === "pageview" ? "" : data.datapoint,
        props: {},
        import_id: importId,
      });

      return acc;
    }, []);
  }
}
