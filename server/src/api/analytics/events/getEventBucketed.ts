import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { TimeBucket } from "../types.js";
import { getFilterStatement } from "../utils/getFilterStatement.js";
import { getTimeStatement, processResults, TimeBucketToFn } from "../utils/utils.js";

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

export async function getEventBucketed(req: FastifyRequest<GetEventBucketedRequest>, res: FastifyReply) {
  const site = req.params.siteId;
  const { bucket = "hour", limit } = req.query;
  const timeZone = req.query.time_zone || "UTC";

  if (!TimeBucketToFn[bucket]) {
    return res.status(400).send({ error: `Invalid bucket value: ${bucket}` });
  }

  const topLimit = parseLimit(limit);

  const timeStatement = getTimeStatement(req.query);
  const filterStatement = getFilterStatement(req.query.filters, Number(site), timeStatement);

  const query = `
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

  try {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteId: Number(site),
        limit: topLimit,
        timeZone,
      },
    });

    const data = await processResults<GetEventBucketedResponse[number]>(result);
    return res.send({ data });
  } catch (error) {
    console.error("Generated Query:", query);
    console.error("Error fetching bucketed event data:", error);
    return res.status(500).send({ error: "Failed to fetch bucketed event data" });
  }
}
