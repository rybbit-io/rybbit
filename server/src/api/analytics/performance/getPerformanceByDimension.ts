import { FastifyReply, FastifyRequest } from "fastify";
import { getTimeStatement } from "../utils/utils.js";
import { FilterParams } from "@rybbit/shared";
import { getFilterStatement } from "../utils/getFilterStatement.js";
import { analyticsRoute, getPaginationStatements, runPaginatedQuery } from "../utils/analyticsQuery.js";

interface GetPerformanceByDimensionRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    limit?: number;
    page?: number;
    sort_by?: string;
    sort_order?: "asc" | "desc";
    dimension: string;
  }>;
}

// Generic type for performance by dimension
export type PerformanceByDimensionItem = {
  [key: string]: any; // The dimension field (pathname, country, etc.)
  event_count: number;
  lcp_avg: number | null;
  lcp_p50: number | null;
  lcp_p75: number | null;
  lcp_p90: number | null;
  lcp_p99: number | null;
  cls_avg: number | null;
  cls_p50: number | null;
  cls_p75: number | null;
  cls_p90: number | null;
  cls_p99: number | null;
  inp_avg: number | null;
  inp_p50: number | null;
  inp_p75: number | null;
  inp_p90: number | null;
  inp_p99: number | null;
  fcp_avg: number | null;
  fcp_p50: number | null;
  fcp_p75: number | null;
  fcp_p90: number | null;
  fcp_p99: number | null;
  ttfb_avg: number | null;
  ttfb_p50: number | null;
  ttfb_p75: number | null;
  ttfb_p90: number | null;
  ttfb_p99: number | null;
};

type GetPerformanceByDimensionPaginatedResponse = {
  data: PerformanceByDimensionItem[];
  totalCount: number;
};

export const buildPerformanceByDimensionQuery = (
  query: GetPerformanceByDimensionRequest["Querystring"],
  siteId: number,
  isCountQuery: boolean = false
) => {
  const { filters, sort_by: sortBy, sort_order: sortOrder, dimension } = query;

  // Validate dimension
  const validDimensions = ["pathname", "country", "device_type", "browser", "operating_system", "region"];

  if (!validDimensions.includes(dimension)) {
    throw new Error(`Invalid dimension: ${dimension}`);
  }

  const timeStatement = getTimeStatement(query);
  const filterStatement = getFilterStatement(filters, siteId, timeStatement);

  const { limitStatement, offsetStatement } = getPaginationStatements(query, 100, isCountQuery);

  // Handle sorting
  const validSortColumns = [
    dimension,
    "event_count",
    "lcp_avg",
    "lcp_p50",
    "lcp_p75",
    "lcp_p90",
    "lcp_p99",
    "cls_avg",
    "cls_p50",
    "cls_p75",
    "cls_p90",
    "cls_p99",
    "inp_avg",
    "inp_p50",
    "inp_p75",
    "inp_p90",
    "inp_p99",
    "fcp_avg",
    "fcp_p50",
    "fcp_p75",
    "fcp_p90",
    "fcp_p99",
    "ttfb_avg",
    "ttfb_p50",
    "ttfb_p75",
    "ttfb_p90",
    "ttfb_p99",
  ];
  const validSortBy = sortBy && validSortColumns.includes(sortBy) ? sortBy : "event_count";
  const validSortOrder = sortOrder === "asc" ? "ASC" : "DESC";
  const orderByStatement = !isCountQuery ? `ORDER BY ${validSortBy} ${validSortOrder} NULLS LAST` : "";

  const baseCteQuery = `
    PerformanceStats AS (
        SELECT
            ${dimension},
            COUNT(*) as event_count,
            avgIf(lcp, lcp IS NOT NULL) as lcp_avg,
            quantileIf(0.5)(lcp, lcp IS NOT NULL) as lcp_p50,
            quantileIf(0.75)(lcp, lcp IS NOT NULL) as lcp_p75,
            quantileIf(0.9)(lcp, lcp IS NOT NULL) as lcp_p90,
            quantileIf(0.99)(lcp, lcp IS NOT NULL) as lcp_p99,
            avgIf(cls, cls IS NOT NULL) as cls_avg,
            quantileIf(0.5)(cls, cls IS NOT NULL) as cls_p50,
            quantileIf(0.75)(cls, cls IS NOT NULL) as cls_p75,
            quantileIf(0.9)(cls, cls IS NOT NULL) as cls_p90,
            quantileIf(0.99)(cls, cls IS NOT NULL) as cls_p99,
            avgIf(inp, inp IS NOT NULL) as inp_avg,
            quantileIf(0.5)(inp, inp IS NOT NULL) as inp_p50,
            quantileIf(0.75)(inp, inp IS NOT NULL) as inp_p75,
            quantileIf(0.9)(inp, inp IS NOT NULL) as inp_p90,
            quantileIf(0.99)(inp, inp IS NOT NULL) as inp_p99,
            avgIf(fcp, fcp IS NOT NULL) as fcp_avg,
            quantileIf(0.5)(fcp, fcp IS NOT NULL) as fcp_p50,
            quantileIf(0.75)(fcp, fcp IS NOT NULL) as fcp_p75,
            quantileIf(0.9)(fcp, fcp IS NOT NULL) as fcp_p90,
            quantileIf(0.99)(fcp, fcp IS NOT NULL) as fcp_p99,
            avgIf(ttfb, ttfb IS NOT NULL) as ttfb_avg,
            quantileIf(0.5)(ttfb, ttfb IS NOT NULL) as ttfb_p50,
            quantileIf(0.75)(ttfb, ttfb IS NOT NULL) as ttfb_p75,
            quantileIf(0.9)(ttfb, ttfb IS NOT NULL) as ttfb_p90,
            quantileIf(0.99)(ttfb, ttfb IS NOT NULL) as ttfb_p99
        FROM events
        WHERE 
          site_id = {siteId:Int32}
          AND type = 'performance'
          AND ${dimension} IS NOT NULL 
          AND ${dimension} <> ''
          ${filterStatement}
          ${timeStatement}
        GROUP BY ${dimension}
    )
  `;

  if (isCountQuery) {
    return `
    WITH ${baseCteQuery}
    SELECT COUNT(DISTINCT ${dimension}) as totalCount FROM PerformanceStats;
    `;
  }

  return `
  WITH ${baseCteQuery}
  SELECT
      ${dimension},
      event_count,
      lcp_avg,
      lcp_p50,
      lcp_p75,
      lcp_p90,
      lcp_p99,
      cls_avg,
      cls_p50,
      cls_p75,
      cls_p90,
      cls_p99,
      inp_avg,
      inp_p50,
      inp_p75,
      inp_p90,
      inp_p99,
      fcp_avg,
      fcp_p50,
      fcp_p75,
      fcp_p90,
      fcp_p99,
      ttfb_avg,
      ttfb_p50,
      ttfb_p75,
      ttfb_p90,
      ttfb_p99
  FROM PerformanceStats
  ${orderByStatement}
  ${limitStatement}
  ${offsetStatement};
  `;
};

export const getPerformanceByDimension = analyticsRoute<GetPerformanceByDimensionRequest>(
  "performance by dimension",
  async (req: FastifyRequest<GetPerformanceByDimensionRequest>, res: FastifyReply) => {
    const siteId = Number(req.params.siteId);
    const params = { siteId };

    const result = await runPaginatedQuery<PerformanceByDimensionItem>(
      { query: buildPerformanceByDimensionQuery(req.query, siteId, false), params },
      { query: buildPerformanceByDimensionQuery(req.query, siteId, true), params }
    );

    return res.send({ data: result });
  }
);
