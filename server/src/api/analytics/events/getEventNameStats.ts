import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";
import { effectiveUserId } from "../utils/effectiveUserId.js";
import { getFilterStatement } from "../utils/getFilterStatement.js";
import { resolveTimeWindow } from "../utils/timeWindow.js";

// The buckets a row's trend may be drawn in. Coarse on purpose: the client
// picks the one that keeps a trend to a few dozen points, so a year of data is
// never returned minute by minute for a thousand names.
export const TREND_BUCKETS = ["hour", "day", "week", "month"] as const;
export type TrendBucket = (typeof TREND_BUCKETS)[number];

export const isTrendBucket = (value: unknown): value is TrendBucket =>
  typeof value === "string" && (TREND_BUCKETS as readonly string[]).includes(value);

export type EventNameStat = {
  eventName: string;
  count: number;
  users: number;
  /** UTC, as ClickHouse prints it: `YYYY-MM-DD hh:mm:ss`. */
  lastSeen: string;
  /** Events per bucket, aligned to the response's `buckets`. */
  trend: number[];
};

export type GetEventNameStatsResponse = {
  /** Bucket start times in the request's timezone, oldest first. */
  buckets: string[];
  events: EventNameStat[];
};

export interface GetEventNameStatsRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    trend_bucket?: string;
  }>;
}

type EventNameStatsRow = Omit<EventNameStat, "trend"> & {
  // sumMap's result: the buckets that hold events and the count in each.
  trend: [string[], (number | string)[]];
};

const CUSTOM_EVENT_ROWS = `
      site_id = {siteId:Int32}
      AND type = 'custom_event'
      AND event_name IS NOT NULL
      AND event_name != ''`;

const fragments = (query: GetEventNameStatsRequest["Querystring"], siteId: number) => {
  const window = resolveTimeWindow(query);
  const timeStatement = window.where();
  const filterStatement = getFilterStatement(query.filters, siteId, timeStatement, {
    sessionLevelParams: ["channel"],
  });
  return { window, timeStatement, filterStatement };
};

/**
 * Every custom event name in the period with its count, its users, when it
 * last fired and its count per bucket: one aggregation for the whole table
 * rather than a query per row.
 */
export const buildEventNameStatsQuery = (
  query: GetEventNameStatsRequest["Querystring"],
  siteId: number,
  bucket: TrendBucket
) => {
  const { window, timeStatement, filterStatement } = fragments(query, siteId);

  return `
    SELECT
      event_name AS eventName,
      count() AS count,
      uniqExact(${effectiveUserId()}) AS users,
      toString(max(timestamp)) AS lastSeen,
      sumMap([${window.bucketed("timestamp", bucket)}], [toUInt64(1)]) AS trend
    FROM events
    WHERE${CUSTOM_EVENT_ROWS}
      ${timeStatement}
      ${filterStatement}
    GROUP BY event_name
    ORDER BY count DESC, eventName ASC
    LIMIT 1000
  `;
};

/**
 * The buckets the trends are drawn over. A name's trend only lists the buckets
 * it fired in, so the gaps are filled from here: a bucket with no events at
 * all still gets its zero.
 */
export const buildEventTrendBucketsQuery = (
  query: GetEventNameStatsRequest["Querystring"],
  siteId: number,
  bucket: TrendBucket
) => {
  const { window, timeStatement, filterStatement } = fragments(query, siteId);

  return `
    SELECT
      ${window.bucketed("timestamp", bucket)} AS time
    FROM events
    WHERE${CUSTOM_EVENT_ROWS}
      ${timeStatement}
      ${filterStatement}
    GROUP BY time
    ORDER BY time
    ${window.fill(bucket)}
  `;
};

/** Spreads each name's sparse (bucket, count) pairs over the shared bucket axis. */
export const alignTrends = (buckets: string[], rows: EventNameStatsRow[]): EventNameStat[] => {
  const position = new Map(buckets.map((bucket, index) => [bucket, index]));

  return rows.map(({ trend: [times, counts], ...row }) => {
    const trend = new Array<number>(buckets.length).fill(0);
    times.forEach((time, index) => {
      const at = position.get(time);
      if (at !== undefined) trend[at] = Number(counts[index]);
    });
    // processResults turns a numeric-looking name ("404") into a number.
    return { ...row, eventName: String(row.eventName), trend };
  });
};

export const getEventNameStats = analyticsRoute<GetEventNameStatsRequest>(
  "event name stats",
  async (req: FastifyRequest<GetEventNameStatsRequest>, res: FastifyReply) => {
    const siteId = Number(req.params.siteId);
    const bucket = req.query.trend_bucket ?? "day";

    if (!isTrendBucket(bucket)) {
      return res.status(400).send({ error: `Invalid trend_bucket value: ${bucket}` });
    }

    const [rows, bucketRows] = await Promise.all([
      runAnalyticsQuery<EventNameStatsRow>({
        query: buildEventNameStatsQuery(req.query, siteId, bucket),
        params: { siteId },
      }),
      runAnalyticsQuery<{ time: string }>({
        query: buildEventTrendBucketsQuery(req.query, siteId, bucket),
        params: { siteId },
      }),
    ]);

    const buckets = bucketRows.map(row => row.time);
    const data: GetEventNameStatsResponse = { buckets, events: alignTrends(buckets, rows) };

    return res.send({ data });
  }
);
