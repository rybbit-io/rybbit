import { clearSelfReferrer, getAllUrlParams } from "../../tracker/utils.js";
import { getChannel } from "../../tracker/getChannel.js";
import { RybbitEvent } from "./rybbit.js";
import { z } from "zod";
import { deriveKeyOnlySchema } from "./utils.js";

export type PlausibleEvent = z.input<
  typeof PlausibleImportMapper.plausibleEventKeyOnlySchema
>;

export class PlausibleImportMapper {
  private static readonly plausibleEventSchema = z.object({
    timestamp: z
      .string()
      .regex(
        /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]) ([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/
      ),
    session_id: z.string().uuid(),
    user_id: z.string().uuid(),
    hostname: z.string().max(253),
    pathname: z.string().max(2048),
    querystring: z.string().max(2048),
    referrer: z.string().max(2048),
    browser: z.string().max(30),
    browser_version: z.string().max(20),
    operating_system: z.string().max(25),
    operating_system_version: z.string().max(20),
    device_type: z.string().max(20),
    country: z
      .string()
      .regex(/^[A-Z]{2}$/)
      .or(z.literal("")),
    region: z
      .string()
      .regex(/^[A-Z]{2}-[A-Z0-9]{1,3}$/)
      .or(z.literal("")),
    city: z.string().max(60),
    type: z.enum(["pageview", "custom_event"]),
    event_name: z.string().max(256),
    props: z.string().max(4096),
  });

  static readonly plausibleEventKeyOnlySchema = deriveKeyOnlySchema(
    PlausibleImportMapper.plausibleEventSchema
  );

  static transform(
    events: PlausibleEvent[],
    site: number,
    importId: string
  ): RybbitEvent[] {
    return events.reduce<RybbitEvent[]>((acc, event) => {
      const parsed =
        PlausibleImportMapper.plausibleEventSchema.safeParse(event);
      if (!parsed.success) return acc;

      const data = parsed.data;
      let parsedProps: Record<string, unknown> = {};
      try {
        parsedProps = JSON.parse(data.props || "{}");
      } catch {
        // ignore invalid JSON
      }

      const referrer = clearSelfReferrer(data.referrer, data.hostname.replace(/^www\./, ""));

      acc.push({
        site_id: site,
        timestamp: data.timestamp,
        session_id: data.session_id,
        user_id: data.user_id,
        hostname: data.hostname,
        pathname: data.pathname,
        querystring: data.querystring,
        url_parameters: getAllUrlParams(data.querystring),
        page_title: "",
        referrer,
        channel: getChannel(referrer, data.querystring, data.hostname),
        browser: data.browser,
        browser_version: data.browser_version,
        operating_system: data.operating_system,
        operating_system_version: data.operating_system_version,
        language: "",
        country: data.country,
        region: data.region,
        city: data.city,
        lat: 0,
        lon: 0,
        screen_width: 0,
        screen_height: 0,
        device_type: data.device_type,
        type: data.type,
        event_name: data.event_name,
        props: parsedProps,
        import_id: importId,
      });

      return acc;
    }, []);
  }
}
