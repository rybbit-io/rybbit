import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { getTimeStatement, processResults } from "../utils/utils.js";
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

const parsePositiveInt = (value: unknown, fallback: number) => {
  const parsed = parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getQuery = (request: FastifyRequest<BotDimensionRequest>, isCountQuery = false) => {
  const { dimension, limit, page } = request.query;
  if (!BOT_DIMENSIONS.has(dimension)) {
    throw new Error(`Unsupported bot dimension: ${dimension}`);
  }

  const expression = getBotSqlParam(dimension);
  const timeStatement = getTimeStatement(request.query);
  const filterStatement = getBotFilterStatement(request.query.filters);
  const layerStatement = getBotLayerStatement(request.query.layer);
  const validatedLimit = parsePositiveInt(limit, 100);
  const validatedPage = parsePositiveInt(page, 1);
  const offset = (validatedPage - 1) * validatedLimit;

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
    LIMIT ${validatedLimit}
    OFFSET ${offset}
  `;
};

export async function getBotDimension(req: FastifyRequest<BotDimensionRequest>, res: FastifyReply) {
  try {
    const [dataResult, countResult] = await Promise.all([
      clickhouse.query({
        query: getQuery(req),
        format: "JSONEachRow",
        query_params: {
          siteId: Number(req.params.siteId),
        },
      }),
      clickhouse.query({
        query: getQuery(req, true),
        format: "JSONEachRow",
        query_params: {
          siteId: Number(req.params.siteId),
        },
      }),
    ]);

    const data = await processResults<BotDimensionItem>(dataResult);
    const countData = await processResults<{ totalCount: number }>(countResult);
    const response: BotDimensionResponse = {
      data,
      totalCount: countData[0]?.totalCount ?? 0,
    };

    return res.send({ data: response });
  } catch (error) {
    console.error("Error fetching bot dimension:", error);
    return res.status(500).send({ error: "Failed to fetch bot dimension" });
  }
}
