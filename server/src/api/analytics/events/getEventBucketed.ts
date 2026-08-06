import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { TimeBucket } from "../types.js";
import { getFilterStatement } from "../utils/getFilterStatement.js";
import { getTimeStatement, TimeBucketToFn } from "../utils/utils.js";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";

export type GetEventBucketedResponse = {
  time: string;
  event_name: string;
  event_count: number;
}[];

interface GetEventBucketedRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    bucket: TimeBucket;
    limit?: string;
  }>;
}

const parseLimit = (limit?: string) => {
  const parsed = Number(limit ?? 5);
  if (!Number.isFinite(parsed)) {
    return 5;
  }
  return Math.min(Math.max(Math.floor(parsed), 1), 10);
};

export const buildEventBucketedQuery = (query: GetEventBucketedRequest["Querystring"], siteId: number) => {
  const { bucket = "hour" } = query;

  const timeStatement = getTimeStatement(query);
  const filterStatement = getFilterStatement(query.filters, siteId, timeStatement);

  return `
    WITH top_events AS (
      SELECT
        event_name
      FROM events
      WHERE
        site_id = {siteId:Int32}
        AND type = 'custom_event'
        AND event_name IS NOT NULL
        AND event_name != ''
        ${timeStatement}
        ${filterStatement}
      GROUP BY event_name
      ORDER BY count() DESC
      LIMIT {limit:Int32}
    )
    SELECT
      toDateTime(${TimeBucketToFn[bucket]}(toTimeZone(timestamp, {timeZone:String}))) AS time,
      event_name,
      count() AS event_count
    FROM events
    WHERE
      site_id = {siteId:Int32}
      AND type = 'custom_event'
      AND event_name IS NOT NULL
      AND event_name != ''
      ${timeStatement}
      ${filterStatement}
      AND event_name IN (SELECT event_name FROM top_events)
    GROUP BY time, event_name
    ORDER BY time
  `;
};

export const getEventBucketed = analyticsRoute<GetEventBucketedRequest>(
  "bucketed event data",
  async (req: FastifyRequest<GetEventBucketedRequest>, res: FastifyReply) => {
    const site = req.params.siteId;
    const { bucket = "hour", limit } = req.query;
    const timeZone = req.query.time_zone || "UTC";

    if (!TimeBucketToFn[bucket]) {
      return res.status(400).send({ error: `Invalid bucket value: ${bucket}` });
    }

    const data = await runAnalyticsQuery<GetEventBucketedResponse[number]>({
      query: buildEventBucketedQuery(req.query, Number(site)),
      params: {
        siteId: Number(site),
        limit: parseLimit(limit),
        timeZone,
      },
    });

    return res.send({ data });
  }
);
