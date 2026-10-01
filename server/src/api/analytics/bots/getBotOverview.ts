import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { getTimeStatement } from "../utils/timeWindow.js";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";
import { resolveBotSource } from "./botSource.js";
import {
  AI_CRAWLER_PURPOSE_SQL_LIST,
  AI_PURPOSE_SQL_LIST,
  type BotLayerKey,
  type BotSourceTable,
  buildAiSessionIdsQuery,
  getBotFilterStatement,
  getBotLayerStatement,
} from "./utils.js";

type BotOverviewRow = {
  bot_requests: number;
  total_events: number;
  bot_percentage: number;
  ai_requests: number;
  ai_agent_requests: number;
  ai_crawler_requests: number;
  ai_training_requests: number;
  ai_search_requests: number;
  /** Requests from a bot the curated patterns know by name, and how many such bots. */
  named_requests: number;
  named_bots: number;
  /** Human sessions in the window, and the ones an AI product sent. */
  sessions: number;
  ai_sessions: number;
  ua_pattern: number;
  header_heuristics: number;
  client_signals: number;
  bot_asn: number;
  rate_anomaly: number;
};

type BotOverviewResponse = BotOverviewRow & {
  /** False when the site has bot blocking off and the numbers are observations. */
  blocking: boolean;
};

export interface BotOverviewRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    layer?: BotLayerKey;
  }>;
}

export const buildBotOverviewQuery = (
  query: BotOverviewRequest["Querystring"],
  table: BotSourceTable = "bot_events"
) => {
  const timeStatement = getTimeStatement(query);
  const filterStatement = getBotFilterStatement(query.filters);
  const layerStatement = getBotLayerStatement(query.layer);

  // A blocked request never reaches `events`, so all traffic is the two tables
  // added together. An observed one is tracked as normal: `events` already
  // holds it, and adding the audit rows again would count it twice.
  const totalRequests = table === "bot_events" ? "all_bot_requests + event_requests" : "event_requests";

  // Unfiltered, the AI sessions are simply counted. A filter keeps the ones
  // that have a matching event, which takes one more pass over the window.
  const aiSessionIds = buildAiSessionIdsQuery(timeStatement);
  const aiSessions = filterStatement
    ? `SELECT uniqExact(session_id) AS ai_sessions
        FROM events
        WHERE site_id = {siteId:Int32}
          ${filterStatement}
          ${timeStatement}
          AND session_id IN (${aiSessionIds})`
    : `SELECT count() AS ai_sessions
        FROM (${aiSessionIds})`;

  return `
    WITH
      bot_stats AS (
        SELECT
          count() AS bot_requests,
          countIf(detected_ua_pattern) AS ua_pattern,
          countIf(detected_header_heuristics) AS header_heuristics,
          countIf(detected_client_signals) AS client_signals,
          countIf(detected_bot_asn) AS bot_asn,
          countIf(detected_rate_anomaly) AS rate_anomaly,
          -- Purpose is only set on rows written since bot identity shipped, so
          -- these read 0 for older windows rather than being wrong.
          countIf(bot_purpose IN (${AI_PURPOSE_SQL_LIST})) AS ai_requests,
          countIf(bot_purpose = 'ai_agent') AS ai_agent_requests,
          countIf(bot_purpose IN (${AI_CRAWLER_PURPOSE_SQL_LIST})) AS ai_crawler_requests,
          countIf(bot_purpose = 'ai_training') AS ai_training_requests,
          countIf(bot_purpose = 'ai_search') AS ai_search_requests,
          countIf(bot_name != '') AS named_requests,
          uniqExactIf(bot_name, bot_name != '') AS named_bots
        FROM ${table}
        WHERE site_id = {siteId:Int32}
          ${filterStatement}
          ${layerStatement}
          ${timeStatement}
      ),
      all_bot_stats AS (
        SELECT count() AS all_bot_requests
        FROM ${table}
        WHERE site_id = {siteId:Int32}
          ${filterStatement}
          ${timeStatement}
      ),
      event_stats AS (
        SELECT
          count() AS event_requests,
          uniqExact(session_id) AS sessions
        FROM events
        WHERE site_id = {siteId:Int32}
          ${filterStatement}
          ${timeStatement}
      ),
      ai_session_stats AS (
        ${aiSessions}
      )
    SELECT
      bot_requests,
      ${totalRequests} AS total_events,
      if(
        ${totalRequests} = 0,
        0,
        least(100, round(bot_requests * 100.0 / (${totalRequests}), 2))
      ) AS bot_percentage,
      ua_pattern,
      header_heuristics,
      client_signals,
      bot_asn,
      rate_anomaly,
      ai_requests,
      ai_agent_requests,
      ai_crawler_requests,
      ai_training_requests,
      ai_search_requests,
      named_requests,
      named_bots,
      sessions,
      ai_sessions
    FROM bot_stats
    CROSS JOIN all_bot_stats
    CROSS JOIN event_stats
    CROSS JOIN ai_session_stats
  `;
};

export const getBotOverview = analyticsRoute<BotOverviewRequest>(
  "bot overview",
  async (req: FastifyRequest<BotOverviewRequest>, res: FastifyReply) => {
    const source = await resolveBotSource(req.params.siteId);
    const data = await runAnalyticsQuery<BotOverviewRow>({
      query: buildBotOverviewQuery(req.query, source.table),
      params: { siteId: Number(req.params.siteId) },
    });

    const response: BotOverviewResponse | undefined = data[0] && { ...data[0], blocking: source.blocking };
    return res.send({ data: response });
  }
);
