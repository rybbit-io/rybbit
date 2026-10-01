import { AI_OPERATOR_REFERRER_DOMAINS, AI_REFERRER_DOMAIN_TO_OPERATOR, FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { TimeBucket } from "../types.js";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";
import { SESSION_CHANNEL_AGG, SESSION_REFERRER_AGG } from "../utils/sessionAttribution.js";
import { TimeBucketToFn, getTimeStatement, resolveTimeWindow } from "../utils/timeWindow.js";
import { resolveBotSource } from "./botSource.js";
import { AI_PURPOSE_SQL_LIST, type BotSourceTable, getBotFilterStatement } from "./utils.js";

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
  /** Distinct paths the operator's bots requested. */
  pages: number;
  /** Sessions that arrived from the operator's product. */
  referrals: number;
  /** Crawls per referral. 0 when the operator sent no one back. */
  crawls_per_referral: number;
};

/** One named bot behind an operator. `trend` is present only when a bucket was asked for. */
type BotAiBotRow = {
  operator: string;
  name: string;
  purpose: string;
  reads: number;
  pages: number;
  trend?: [time: string, reads: number][];
};

type BotAiSummaryResponseRow = BotAiSummaryRow & {
  /** The referrer domains that count as this operator's product. */
  referrer_domains: string[];
  bots: Omit<BotAiBotRow, "operator">[];
};

const bucketSchema = z.enum(Object.keys(TimeBucketToFn) as [TimeBucket, ...TimeBucket[]]);

export interface BotAiSummaryRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    /** When set, each bot carries its reads per bucket, for a sparkline. */
    bucket?: TimeBucket;
  }>;
}

/**
 * ClickHouse `transform()` mapping a referrer domain onto the operator that
 * runs it, spelled exactly as the bot patterns spell it so the two sides join.
 */
function buildReferrerOperatorExpression(referrer: string) {
  const entries = Object.entries(AI_REFERRER_DOMAIN_TO_OPERATOR);
  const domains = entries.map(([domain]) => `'${domain}'`).join(", ");
  const operators = entries.map(([, operator]) => `'${operator}'`).join(", ");
  return `transform(domainWithoutWWW(${referrer}), [${domains}], [${operators}], '')`;
}

export const buildBotAiSummaryQuery = (
  query: BotAiSummaryRequest["Querystring"],
  table: BotSourceTable = "bot_events"
) => {
  const timeStatement = getTimeStatement(query);
  // The same statement narrows both halves. It is the bot-table builder on
  // purpose: its parameters exist as plain columns on `events` too, and it
  // emits no session subqueries, which would have nothing bounding them here.
  const filterStatement = getBotFilterStatement(query.filters);
  const referrerOperator = buildReferrerOperatorExpression("session_referrer");
  // A filtered view keeps the sessions that have a matching event, the way the
  // overview counts them, so the operators add up to the page's total.
  const sessionFilter = filterStatement
    ? `AND session_id IN (
            SELECT session_id
            FROM events
            WHERE site_id = {siteId:Int32}
              ${filterStatement}
              ${timeStatement}
          )`
    : "";

  return `
    WITH
      crawls AS (
        SELECT
          bot_operator AS operator,
          count() AS crawls,
          countIf(bot_purpose = 'ai_training') AS training_crawls,
          countIf(bot_purpose = 'ai_search') AS search_crawls,
          countIf(bot_purpose = 'ai_agent') AS agent_requests,
          uniqExact(pathname) AS pages
        FROM ${table}
        WHERE site_id = {siteId:Int32}
          AND bot_operator != ''
          AND bot_purpose IN (${AI_PURPOSE_SQL_LIST})
          ${filterStatement}
          ${timeStatement}
        GROUP BY operator
      ),
      referrals AS (
        -- A referral is a session, not an event row: one visit from ChatGPT
        -- that views six pages is one visit sent back. The session takes its
        -- channel and referrer the way the Sessions page does, so the count
        -- here is the count that page lists.
        SELECT
          ${referrerOperator} AS operator,
          count() AS referrals
        FROM (
          SELECT
            session_id,
            ${SESSION_REFERRER_AGG} AS session_referrer,
            ${SESSION_CHANNEL_AGG} AS session_channel
          FROM events
          WHERE site_id = {siteId:Int32}
            ${timeStatement}
            AND session_id IN (
              SELECT session_id
              FROM events
              WHERE site_id = {siteId:Int32}
                AND channel = 'AI'
                ${timeStatement}
            )
          GROUP BY session_id
        )
        WHERE session_channel = 'AI'
          ${sessionFilter}
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
      crawls.pages AS pages,
      referrals.referrals AS referrals,
      if(referrals.referrals = 0, 0, round(crawls.crawls / referrals.referrals, 1)) AS crawls_per_referral
    FROM crawls
    FULL OUTER JOIN referrals ON crawls.operator = referrals.operator
    ORDER BY crawls DESC, referrals DESC
    LIMIT 200
  `;
};

/**
 * The named bots behind each operator: what each read, how many distinct pages,
 * and (with a bucket) its reads over time.
 *
 * Bots are grouped per bucket first and rolled up, so the trend and the totals
 * come out of one pass over the table. Distinct pages cannot be summed across
 * buckets, hence the aggregate state carried up and merged.
 */
export const buildBotAiBotsQuery = (
  query: BotAiSummaryRequest["Querystring"],
  table: BotSourceTable = "bot_events"
) => {
  const window = resolveTimeWindow(query);
  const timeStatement = window.where();
  const filterStatement = getBotFilterStatement(query.filters);
  const bucket = bucketSchema.optional().parse(query.bucket || undefined);

  const where = `
        WHERE site_id = {siteId:Int32}
          AND bot_operator != ''
          AND bot_purpose IN (${AI_PURPOSE_SQL_LIST})
          ${filterStatement}
          ${timeStatement}`;

  if (!bucket) {
    return `
      SELECT
        bot_operator AS operator,
        bot_name AS name,
        bot_purpose AS purpose,
        count() AS reads,
        uniqExact(pathname) AS pages
      FROM ${table}
      ${where}
      GROUP BY operator, name, purpose
      ORDER BY reads DESC
      LIMIT 500
    `;
  }

  return `
    SELECT
      operator,
      name,
      purpose,
      sum(bucket_reads) AS reads,
      uniqExactMerge(pages_state) AS pages,
      arraySort(point -> point.1, groupArray((toString(time), toUInt32(bucket_reads)))) AS trend
    FROM (
      SELECT
        bot_operator AS operator,
        bot_name AS name,
        bot_purpose AS purpose,
        ${window.bucketed("timestamp", bucket)} AS time,
        count() AS bucket_reads,
        uniqExactState(pathname) AS pages_state
      FROM ${table}
      ${where}
      GROUP BY operator, name, purpose, time
    )
    GROUP BY operator, name, purpose
    ORDER BY reads DESC
    LIMIT 500
  `;
};

export const getBotAiSummary = analyticsRoute<BotAiSummaryRequest>(
  "bot ai summary",
  async (req: FastifyRequest<BotAiSummaryRequest>, res: FastifyReply) => {
    if (req.query.bucket && !bucketSchema.safeParse(req.query.bucket).success) {
      return res.status(400).send({ error: "Invalid bucket" });
    }

    const { table } = await resolveBotSource(req.params.siteId);
    const params = { siteId: Number(req.params.siteId) };

    const [operators, bots] = await Promise.all([
      runAnalyticsQuery<BotAiSummaryRow>({ query: buildBotAiSummaryQuery(req.query, table), params }),
      runAnalyticsQuery<BotAiBotRow>({ query: buildBotAiBotsQuery(req.query, table), params }),
    ]);

    const botsByOperator = new Map<string, BotAiSummaryResponseRow["bots"]>();
    for (const { operator, trend, ...bot } of bots) {
      const list = botsByOperator.get(operator) ?? [];
      list.push(trend ? { ...bot, trend: trend.map(([time, reads]) => [String(time), Number(reads)]) } : bot);
      botsByOperator.set(operator, list);
    }

    const data: BotAiSummaryResponseRow[] = operators.map(row => ({
      ...row,
      referrer_domains: AI_OPERATOR_REFERRER_DOMAINS[row.operator] ?? [],
      bots: botsByOperator.get(row.operator) ?? [],
    }));

    return res.send({ data });
  }
);
