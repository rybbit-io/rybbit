import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { TimeBucket } from "../types.js";
import { resolveTimeWindow } from "../utils/timeWindow.js";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";
import { resolveBotSource } from "./botSource.js";
import {
  AI_CRAWLER_PURPOSE_SQL_LIST,
  type BotLayerKey,
  type BotSourceTable,
  getBotFilterStatement,
  getBotLayerStatement,
  getBotPurposeStatement,
} from "./utils.js";

type BotTimeSeriesPoint = {
  time: string;
  bot_requests: number;
  ai_agent_requests: number;
  ai_crawler_requests: number;
  ai_training_requests: number;
  ai_search_requests: number;
  search_requests: number;
  scripted_requests: number;
  unclassified_requests: number;
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

export const buildBotTimeSeriesQuery = (
  query: BotTimeSeriesRequest["Querystring"],
  table: BotSourceTable = "bot_events"
) => {
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
      -- Every split is returned on every bucket so the chart can change its
      -- breakdown without a second round trip; all of them read 0 on windows
      -- predating identity. What is left after these is the known tooling:
      -- SEO, link previews, monitoring, security.
      countIf(bot_purpose = 'ai_agent') AS ai_agent_requests,
      countIf(bot_purpose IN (${AI_CRAWLER_PURPOSE_SQL_LIST})) AS ai_crawler_requests,
      countIf(bot_purpose = 'ai_training') AS ai_training_requests,
      countIf(bot_purpose = 'ai_search') AS ai_search_requests,
      countIf(bot_purpose = 'search') AS search_requests,
      countIf(bot_purpose IN ('scripted', 'headless')) AS scripted_requests,
      countIf(bot_purpose IN ('', 'unknown')) AS unclassified_requests
    FROM ${table}
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
    const source = await resolveBotSource(req.params.siteId);
    const data = await runAnalyticsQuery<BotTimeSeriesPoint>({
      query: buildBotTimeSeriesQuery(req.query, source.table),
      params: { siteId: Number(req.params.siteId) },
    });

    return res.send({ data });
  }
);
