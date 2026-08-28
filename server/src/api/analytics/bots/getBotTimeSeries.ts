import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { TimeBucket } from "../types.js";
import { resolveTimeWindow } from "../utils/timeWindow.js";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";
import {
  AI_CRAWLER_PURPOSE_SQL_LIST,
  AI_PURPOSE_SQL_LIST,
  type BotLayerKey,
  getBotFilterStatement,
  getBotLayerStatement,
  getBotPurposeStatement,
} from "./utils.js";

type BotTimeSeriesPoint = {
  time: string;
  bot_requests: number;
  ai_agent_requests: number;
  ai_crawler_requests: number;
};

export interface BotTimeSeriesRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    bucket: TimeBucket;
    layer?: BotLayerKey;
    /** A single purpose, or "ai" / "ai_crawler" for the grouped families. */
    purpose?: string;
  }>;
}

export const buildBotTimeSeriesQuery = (query: BotTimeSeriesRequest["Querystring"]) => {
  const { bucket = "hour" } = query;
  const window = resolveTimeWindow(query);
  const timeStatement = window.where();
  const filterStatement = getBotFilterStatement(query.filters);
  const layerStatement = getBotLayerStatement(query.layer);
  const purposeStatement = getBotPurposeStatement(query.purpose);
  const fillClause = window.fill(bucket);

  return `
    SELECT
      ${window.bucketed("timestamp", bucket)} AS time,
      count() AS bot_requests,
      -- Returned on every bucket so the chart can draw agents against crawlers
      -- without a second round trip; both read 0 on windows predating identity.
      countIf(bot_purpose = 'ai_agent') AS ai_agent_requests,
      countIf(bot_purpose IN (${AI_CRAWLER_PURPOSE_SQL_LIST})) AS ai_crawler_requests
    FROM bot_events
    WHERE site_id = {siteId:Int32}
      ${filterStatement}
      ${layerStatement}
      ${purposeStatement}
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
