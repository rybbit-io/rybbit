import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { getTimeStatement } from "../utils/utils.js";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";
import { type BotLayerKey, getBotFilterStatement, getBotLayerStatement } from "./utils.js";

type BotOverviewResponse = {
  bot_requests: number;
  total_events: number;
  bot_percentage: number;
  ua_pattern: number;
  header_heuristics: number;
  client_signals: number;
  bot_asn: number;
  rate_anomaly: number;
};

export interface BotOverviewRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    layer?: BotLayerKey;
  }>;
}

export const buildBotOverviewQuery = (query: BotOverviewRequest["Querystring"]) => {
  const timeStatement = getTimeStatement(query);
  const filterStatement = getBotFilterStatement(query.filters);
  const layerStatement = getBotLayerStatement(query.layer);

  return `
    WITH
      bot_stats AS (
        SELECT
          count() AS bot_requests,
          countIf(detected_ua_pattern) AS ua_pattern,
          countIf(detected_header_heuristics) AS header_heuristics,
          countIf(detected_client_signals) AS client_signals,
          countIf(detected_bot_asn) AS bot_asn,
          countIf(detected_rate_anomaly) AS rate_anomaly
        FROM bot_events
        WHERE site_id = {siteId:Int32}
          ${filterStatement}
          ${layerStatement}
          ${timeStatement}
      ),
      all_bot_stats AS (
        SELECT count() AS all_bot_requests
        FROM bot_events
        WHERE site_id = {siteId:Int32}
          ${filterStatement}
          ${timeStatement}
      ),
      event_stats AS (
        SELECT count() AS event_requests
        FROM events
        WHERE site_id = {siteId:Int32}
          ${filterStatement}
          ${timeStatement}
      )
    SELECT
      bot_requests,
      all_bot_requests + event_requests AS total_events,
      if(
        all_bot_requests + event_requests = 0,
        0,
        round(bot_requests * 100.0 / (all_bot_requests + event_requests), 2)
      ) AS bot_percentage,
      ua_pattern,
      header_heuristics,
      client_signals,
      bot_asn,
      rate_anomaly
    FROM bot_stats
    CROSS JOIN all_bot_stats
    CROSS JOIN event_stats
  `;
};

export const getBotOverview = analyticsRoute<BotOverviewRequest>(
  "bot overview",
  async (req: FastifyRequest<BotOverviewRequest>, res: FastifyReply) => {
    const data = await runAnalyticsQuery<BotOverviewResponse>({
      query: buildBotOverviewQuery(req.query),
      params: { siteId: Number(req.params.siteId) },
    });

    return res.send({ data: data[0] });
  }
);
