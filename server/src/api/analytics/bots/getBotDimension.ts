import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { getTimeStatement } from "../utils/timeWindow.js";
import { analyticsRoute, getPaginationStatements, runPaginatedQuery } from "../utils/analyticsQuery.js";
import { resolveBotSource } from "./botSource.js";
import {
  BOT_DIMENSIONS,
  type BotDimensionKey,
  type BotLayerKey,
  type BotSourceTable,
  getBotFilterStatement,
  getBotLayerStatement,
  getBotPurposeStatement,
  getBotSqlParam,
} from "./utils.js";

type BotDimensionItem = {
  value: string;
  hostname?: string;
  count: number;
  percentage: number;
};

type BotDimensionResponse = {
  data: BotDimensionItem[];
  totalCount: number;
};

export interface BotDimensionRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    dimension: BotDimensionKey;
    layer?: BotLayerKey;
    /** A single purpose, or "ai" / "ai_crawler" for the grouped families. */
    purpose?: string;
    limit?: number;
    page?: number;
  }>;
}

export const buildBotDimensionQuery = (
  query: BotDimensionRequest["Querystring"],
  isCountQuery = false,
  table: BotSourceTable = "bot_events"
) => {
  const { dimension } = query;
  if (!BOT_DIMENSIONS.has(dimension)) {
    throw new Error(`Unsupported bot dimension: ${dimension}`);
  }

  const expression = getBotSqlParam(dimension);
  const timeStatement = getTimeStatement(query);
  const filterStatement = getBotFilterStatement(query.filters);
  const layerStatement = getBotLayerStatement(query.layer);
  const purposeStatement = getBotPurposeStatement(query.purpose);
  const { limitStatement, offsetStatement } = getPaginationStatements(query, 100, isCountQuery);

  const groupedQuery = `
    SELECT
      ${expression} AS value,
      ${dimension === "pathname" ? "any(hostname)" : "''"} AS hostname,
      count() AS count,
      round(count() * 100.0 / sum(count()) OVER (), 2) AS percentage
    FROM ${table}
    WHERE site_id = {siteId:Int32}
      ${filterStatement}
      ${layerStatement}
      ${purposeStatement}
      ${timeStatement}
    GROUP BY value
  `;

  if (isCountQuery) {
    return `
      SELECT count() AS totalCount
      FROM (${groupedQuery})
    `;
  }

  return `
    ${groupedQuery}
    ORDER BY count DESC
    ${limitStatement}
    ${offsetStatement}
  `;
};

export const getBotDimension = analyticsRoute<BotDimensionRequest>(
  "bot dimension",
  async (req: FastifyRequest<BotDimensionRequest>, res: FastifyReply) => {
    const params = { siteId: Number(req.params.siteId) };
    const { table } = await resolveBotSource(req.params.siteId);

    const response: BotDimensionResponse = await runPaginatedQuery<BotDimensionItem>(
      { query: buildBotDimensionQuery(req.query, false, table), params },
      { query: buildBotDimensionQuery(req.query, true, table), params }
    );

    return res.send({ data: response });
  }
);
