import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import SqlString from "sqlstring";
import { TimeBucket } from "../types.js";
import { getTimeStatement, TimeBucketToFn } from "../utils/utils.js";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";
import { type BotLayerKey, getBotFilterStatement, getBotLayerStatement, getBotTimeStatementFill } from "./utils.js";

type BotTimeSeriesPoint = {
  time: string;
  bot_requests: number;
};

export interface BotTimeSeriesRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    bucket: TimeBucket;
    layer?: BotLayerKey;
  }>;
}

export const buildBotTimeSeriesQuery = (query: BotTimeSeriesRequest["Querystring"]) => {
  const { bucket = "hour", time_zone } = query;
  const timeStatement = getTimeStatement(query);
  const filterStatement = getBotFilterStatement(query.filters);
  const layerStatement = getBotLayerStatement(query.layer);
  const hasBoundedTime =
    Boolean(query.start_date && query.end_date) ||
    Boolean(query.start_datetime && query.end_datetime) ||
    (query.past_minutes_start !== undefined && query.past_minutes_end !== undefined);
  const fillClause = hasBoundedTime ? getBotTimeStatementFill(query, bucket) : "";
  const timezone = SqlString.escape(time_zone || "UTC");

  return `
    SELECT
      toDateTime(${TimeBucketToFn[bucket]}(toTimeZone(timestamp, ${timezone}))) AS time,
      count() AS bot_requests
    FROM bot_events
    WHERE site_id = {siteId:Int32}
      ${filterStatement}
      ${layerStatement}
      ${timeStatement}
    GROUP BY time
    ORDER BY time ${fillClause}
  `;
};

export const getBotTimeSeries = analyticsRoute<BotTimeSeriesRequest>(
  "bot time series",
  async (req: FastifyRequest<BotTimeSeriesRequest>, res: FastifyReply) => {
    const data = await runAnalyticsQuery<BotTimeSeriesPoint>({
      query: buildBotTimeSeriesQuery(req.query),
      params: { siteId: Number(req.params.siteId) },
    });

    return res.send({ data });
  }
);
