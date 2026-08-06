import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { getTimeStatement } from "../utils/utils.js";
import { analyticsRoute, getPaginationStatements, runPaginatedQuery } from "../utils/analyticsQuery.js";
import {
  BOT_DIMENSIONS,
  type BotDimensionKey,
  type BotLayerKey,
  getBotFilterStatement,
  getBotLayerStatement,
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
    limit?: number;
    page?: number;
  }>;
}

export const buildBotDimensionQuery = (query: BotDimensionRequest["Querystring"], isCountQuery = false) => {
  const { dimension } = query;
  if (!BOT_DIMENSIONS.has(dimension)) {
    throw new Error(`Unsupported bot dimension: ${dimension}`);
  }

  const expression = getBotSqlParam(dimension);
  const timeStatement = getTimeStatement(query);
  const filterStatement = getBotFilterStatement(query.filters);
  const layerStatement = getBotLayerStatement(query.layer);
  const { limitStatement, offsetStatement } = getPaginationStatements(query, 100, isCountQuery);

  const groupedQuery = `
    SELECT
      ${expression} AS value,
      ${dimension === "pathname" ? "any(hostname)" : "''"} AS hostname,
      count() AS count,
      round(count() * 100.0 / sum(count()) OVER (), 2) AS percentage
    FROM bot_events
    WHERE site_id = {siteId:Int32}
      ${filterStatement}
      ${layerStatement}
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

    const response: BotDimensionResponse = await runPaginatedQuery<BotDimensionItem>(
      { query: buildBotDimensionQuery(req.query), params },
      { query: buildBotDimensionQuery(req.query, true), params }
    );

    return res.send({ data: response });
  }
);
