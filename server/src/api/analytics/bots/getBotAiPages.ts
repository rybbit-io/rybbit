import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { analyticsRoute, runPaginatedQuery } from "../utils/analyticsQuery.js";
import { SESSION_CHANNEL_AGG } from "../utils/sessionAttribution.js";
import { getTimeStatement } from "../utils/timeWindow.js";
import { resolveBotSource } from "./botSource.js";
import { AI_PURPOSE_SQL_LIST, type BotSourceTable, getBotFilterStatement } from "./utils.js";

/**
 * One row per page an AI system read: how often, how often on a person's
 * behalf, how many AI-referred visits started there, and what people viewed.
 *
 * The four numbers answer one question from four directions: is the page AI
 * reads most the page people arrive on from AI, and does anyone else read it.
 */
type BotAiPageRow = {
  pathname: string;
  hostname: string;
  /** Requests from any AI system. */
  reads: number;
  /** The subset an agent fetched for a person. */
  agent_reads: number;
  /** Sessions sent by an AI product whose first pageview was this page. */
  landed: number;
  /** Pageviews in the site's analytics. */
  human_views: number;
};

const MAX_PAGE_SIZE = 100;

const querySchema = z.object({
  purpose: z.enum(["ai", "ai_agent"]).default("ai"),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(50),
  page: z.coerce.number().int().min(1).max(1000).default(1),
});

export interface BotAiPagesRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    /** "ai" (default) ranks by every AI read; "ai_agent" keeps and ranks pages agents opened. */
    purpose?: "ai" | "ai_agent";
    limit?: number | string;
    page?: number | string;
  }>;
}

export const buildBotAiPagesQuery = (
  query: BotAiPagesRequest["Querystring"],
  isCountQuery = false,
  table: BotSourceTable = "bot_events"
) => {
  const { purpose, limit, page } = querySchema.parse({
    purpose: query.purpose || undefined,
    limit: query.limit ?? undefined,
    page: query.page ?? undefined,
  });
  const timeStatement = getTimeStatement(query);
  const filterStatement = getBotFilterStatement(query.filters);
  const agentsOnly = purpose === "ai_agent";
  const order = agentsOnly ? "agent_reads DESC, reads DESC, pathname ASC" : "reads DESC, pathname ASC";

  const readPages = `
        SELECT
          pathname,
          any(hostname) AS hostname,
          count() AS reads,
          countIf(bot_purpose = 'ai_agent') AS agent_reads
        FROM ${table}
        WHERE site_id = {siteId:Int32}
          AND bot_purpose IN (${AI_PURPOSE_SQL_LIST})
          ${filterStatement}
          ${timeStatement}
        GROUP BY pathname
        ${agentsOnly ? "HAVING agent_reads > 0" : ""}`;

  if (isCountQuery) {
    return `
      SELECT count() AS totalCount
      FROM (${readPages})
    `;
  }

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
      ai_pages AS (
        ${readPages}
        ORDER BY ${order}
        LIMIT ${limit}
        OFFSET ${(page - 1) * limit}
      ),
      human_pages AS (
        -- Bounded to the pages on this page of results.
        SELECT
          pathname,
          count() AS views
        FROM events
        WHERE site_id = {siteId:Int32}
          AND type = 'pageview'
          AND pathname IN (SELECT pathname FROM ai_pages)
          ${filterStatement}
          ${timeStatement}
        GROUP BY pathname
      ),
      landed_pages AS (
        -- Where the visits an AI product sent began. Only sessions with an
        -- AI-channel event are grouped, not every session in the window.
        SELECT
          entry_pathname AS pathname,
          count() AS landed
        FROM (
          SELECT
            session_id,
            argMinIf(pathname, timestamp_ms, type = 'pageview') AS entry_pathname,
            countIf(type = 'pageview') AS pageviews,
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
          AND pageviews > 0
          ${sessionFilter}
        GROUP BY pathname
      )
    SELECT
      ai_pages.pathname AS pathname,
      ai_pages.hostname AS hostname,
      ai_pages.reads AS reads,
      ai_pages.agent_reads AS agent_reads,
      landed_pages.landed AS landed,
      human_pages.views AS human_views
    FROM ai_pages
    LEFT JOIN human_pages ON ai_pages.pathname = human_pages.pathname
    LEFT JOIN landed_pages ON ai_pages.pathname = landed_pages.pathname
    ORDER BY ${order}
  `;
};

export const getBotAiPages = analyticsRoute<BotAiPagesRequest>(
  "bot ai pages",
  async (req: FastifyRequest<BotAiPagesRequest>, res: FastifyReply) => {
    const parsed = querySchema.safeParse({
      purpose: req.query.purpose || undefined,
      limit: req.query.limit ?? undefined,
      page: req.query.page ?? undefined,
    });
    if (!parsed.success) {
      return res.status(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid query" });
    }

    const { table } = await resolveBotSource(req.params.siteId);
    const params = { siteId: Number(req.params.siteId) };

    const response = await runPaginatedQuery<BotAiPageRow>(
      { query: buildBotAiPagesQuery(req.query, false, table), params },
      { query: buildBotAiPagesQuery(req.query, true, table), params }
    );

    return res.send({ data: response });
  }
);
