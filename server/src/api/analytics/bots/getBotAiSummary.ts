import { AI_REFERRER_DOMAIN_TO_OPERATOR, FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";
import { getFilterStatement } from "../utils/getFilterStatement.js";
import { getTimeStatement } from "../utils/timeWindow.js";
import { AI_PURPOSE_SQL_LIST, getBotFilterStatement } from "./utils.js";

/**
 * One row per AI operator: how much of the site it read, and how much traffic
 * it sent back.
 *
 * Crawl counts and referral counts come from two different tables written by
 * two unrelated code paths — `bot_events` during bot detection, `events`
 * during channel classification — and are only meaningful next to each other.
 * "OpenAI fetched 4,120 pages and sent 12 visits" is a sentence a site owner
 * can act on; either number alone is trivia.
 */
type BotAiSummaryRow = {
  operator: string;
  crawls: number;
  training_crawls: number;
  search_crawls: number;
  agent_requests: number;
  referrals: number;
  /** Crawls per referral. 0 when the operator sent no one back. */
  crawls_per_referral: number;
};

export interface BotAiSummaryRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{}>;
}

/**
 * ClickHouse `transform()` mapping a referrer domain onto the operator that
 * runs it, spelled exactly as the bot patterns spell it so the two sides join.
 */
function buildReferrerOperatorExpression() {
  const entries = Object.entries(AI_REFERRER_DOMAIN_TO_OPERATOR);
  const domains = entries.map(([domain]) => `'${domain}'`).join(", ");
  const operators = entries.map(([, operator]) => `'${operator}'`).join(", ");
  return `transform(domainWithoutWWW(referrer), [${domains}], [${operators}], '')`;
}

export const buildBotAiSummaryQuery = (query: BotAiSummaryRequest["Querystring"]) => {
  const timeStatement = getTimeStatement(query);
  const botFilterStatement = getBotFilterStatement(query.filters);
  // The referral half reads `events`, so it takes the events-surface filter
  // builder rather than the bot-table one.
  const eventFilterStatement = getFilterStatement(query.filters || "");
  const referrerOperator = buildReferrerOperatorExpression();

  return `
    WITH
      crawls AS (
        SELECT
          bot_operator AS operator,
          count() AS crawls,
          countIf(bot_purpose = 'ai_training') AS training_crawls,
          countIf(bot_purpose = 'ai_search') AS search_crawls,
          countIf(bot_purpose = 'ai_agent') AS agent_requests
        FROM bot_events
        WHERE site_id = {siteId:Int32}
          AND bot_operator != ''
          AND bot_purpose IN (${AI_PURPOSE_SQL_LIST})
          ${botFilterStatement}
          ${timeStatement}
        GROUP BY operator
      ),
      referrals AS (
        SELECT
          ${referrerOperator} AS operator,
          count() AS referrals
        FROM events
        WHERE site_id = {siteId:Int32}
          AND channel = 'AI'
          ${eventFilterStatement}
          ${timeStatement}
        GROUP BY operator
        HAVING operator != ''
      )
    SELECT
      -- FULL OUTER JOIN so an operator that only crawls and one that only
      -- refers both survive; the empty side of the join reads 0, not absent.
      if(crawls.operator != '', crawls.operator, referrals.operator) AS operator,
      crawls.crawls AS crawls,
      crawls.training_crawls AS training_crawls,
      crawls.search_crawls AS search_crawls,
      crawls.agent_requests AS agent_requests,
      referrals.referrals AS referrals,
      if(referrals.referrals = 0, 0, round(crawls.crawls / referrals.referrals, 1)) AS crawls_per_referral
    FROM crawls
    FULL OUTER JOIN referrals ON crawls.operator = referrals.operator
    ORDER BY crawls DESC, referrals DESC
  `;
};

export const getBotAiSummary = analyticsRoute<BotAiSummaryRequest>(
  "bot ai summary",
  async (req: FastifyRequest<BotAiSummaryRequest>, res: FastifyReply) => {
    const data = await runAnalyticsQuery<BotAiSummaryRow>({
      query: buildBotAiSummaryQuery(req.query),
      params: { siteId: Number(req.params.siteId) },
    });

    return res.send({ data });
  }
);
