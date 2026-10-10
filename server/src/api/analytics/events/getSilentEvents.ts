import { FastifyReply, FastifyRequest } from "fastify";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";
import { isValidTimeZone } from "../utils/timeWindow.js";

/** How far back the check reads. Nothing older is ever scanned. */
export const SILENT_LOOKBACK_DAYS = 35;
/** An event is silent once it has gone this long without firing. */
export const SILENT_AFTER_DAYS = 7;
/** It has to have been around for at least this many days before it stopped. */
export const SILENT_MIN_HISTORY_DAYS = 14;
/** "Used to fire daily": it fired on at least this share of those days. */
export const SILENT_MIN_ACTIVE_SHARE = 0.8;

export type SilentEvent = {
  eventName: string;
  /** The last time it fired. UTC, as ClickHouse prints it: `YYYY-MM-DD hh:mm:ss`. */
  lastSeen: string;
  /** Events between its first appearance in the lookback and `lastSeen`. */
  total: number;
  /** Days it fired on in that span. */
  activeDays: number;
  /** Length of that span in days, counting both ends. */
  spanDays: number;
};

export type GetSilentEventsResponse = SilentEvent[];

export interface GetSilentEventsRequest {
  Params: {
    siteId: string;
  };
  Querystring: {
    time_zone?: string;
  };
}

/**
 * Custom events that fired almost every day and then stopped: nothing in the
 * last SILENT_AFTER_DAYS days, after at least SILENT_MIN_HISTORY_DAYS days on
 * which it fired on SILENT_MIN_ACTIVE_SHARE of them. A broken tracking call
 * looks exactly like this, and nothing else on the page shows it, because a
 * name with no events drops out of every list.
 *
 * It is a statement about the site right now, so it reads a fixed window
 * ending at now() and ignores the page's period and filters. Days are counted
 * in the viewer's timezone. Binds `{siteId:Int32}` and `{timeZone:String}`.
 */
export const buildSilentEventsQuery = () => `
    SELECT
      event_name AS eventName,
      toString(max(timestamp)) AS lastSeen,
      count() AS total,
      uniqExact(toDate(timestamp, {timeZone:String})) AS activeDays,
      dateDiff('day', toDate(min(timestamp), {timeZone:String}), toDate(max(timestamp), {timeZone:String})) + 1 AS spanDays
    FROM events
    WHERE
      site_id = {siteId:Int32}
      AND type = 'custom_event'
      AND event_name IS NOT NULL
      AND event_name != ''
      AND timestamp >= now() - INTERVAL ${SILENT_LOOKBACK_DAYS} DAY
    GROUP BY event_name
    HAVING
      max(timestamp) < now() - INTERVAL ${SILENT_AFTER_DAYS} DAY
      AND spanDays >= ${SILENT_MIN_HISTORY_DAYS}
      AND activeDays >= spanDays * ${SILENT_MIN_ACTIVE_SHARE}
    ORDER BY total / spanDays DESC, eventName ASC
    LIMIT 5
  `;

export const getSilentEvents = analyticsRoute<GetSilentEventsRequest>(
  "silent events",
  async (req: FastifyRequest<GetSilentEventsRequest>, res: FastifyReply) => {
    const siteId = Number(req.params.siteId);
    const timeZone = req.query.time_zone && isValidTimeZone(req.query.time_zone) ? req.query.time_zone : "UTC";

    const data = await runAnalyticsQuery<SilentEvent>({
      query: buildSilentEventsQuery(),
      params: { siteId, timeZone },
    });

    // processResults turns a numeric-looking name ("404") into a number.
    return res.send({ data: data.map(row => ({ ...row, eventName: String(row.eventName) })) });
  }
);
