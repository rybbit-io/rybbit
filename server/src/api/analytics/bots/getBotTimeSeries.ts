import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { TimeBucket } from "../types.js";
import { resolveTimeWindow } from "../utils/timeWindow.js";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";
import { type BotLayerKey, getBotFilterStatement, getBotLayerStatement } from "./utils.js";

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
  const { bucket = "hour" } = query;
  const window = resolveTimeWindow(query);
  const timeStatement = window.where();
  const filterStatement = getBotFilterStatement(query.filters);
  const layerStatement = getBotLayerStatement(query.layer);
  const fillClause = window.fill(bucket);

  return `
    SELECT
      ${window.bucketed("timestamp", bucket)} AS time,
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
