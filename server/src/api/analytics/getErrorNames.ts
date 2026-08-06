import { FastifyReply, FastifyRequest } from "fastify";
import { getTimeStatement } from "./utils/utils.js";
import { FilterParams } from "@rybbit/shared";
import { getFilterStatement } from "./utils/getFilterStatement.js";
import { analyticsRoute, getPaginationStatements, runAnalyticsQuery, runPaginatedQuery } from "./utils/analyticsQuery.js";

interface GetErrorNamesRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    limit?: number;
    page?: number;
  }>;
}

// This type represents a single error item in the array
export type ErrorNameItem = {
  value: string; // Error message
  errorName: string; // Error type (TypeError, ReferenceError, etc.)
  count: number; // Total occurrences
  sessionCount: number; // Unique sessions affected
  percentage: number;
};

// Structure for paginated response
type ErrorNamesPaginatedResponse = {
  data: ErrorNameItem[];
  totalCount: number;
};

export const buildErrorNamesQuery = (
  query: GetErrorNamesRequest["Querystring"],
  siteId: number,
  isCountQuery: boolean = false
) => {
  const { filters } = query;

  const timeStatement = getTimeStatement(query);
  const filterStatement = getFilterStatement(filters, siteId, timeStatement);

  // Default to 10 for non-paginated use
  const { limitStatement, offsetStatement } = getPaginationStatements(query, 10, isCountQuery);

  // For errors, we want to count total occurrences and unique sessions affected
  // Group by error message instead of error name
  const baseCteQuery = `
    ErrorStats AS (
        SELECT
            JSONExtractString(toString(props), 'message') as value,
            any(event_name) as errorName,
            count(*) as total_occurrences,
            count(DISTINCT session_id) as unique_sessions
        FROM events
        WHERE
          site_id = {siteId:Int32}
          AND type = 'error'
          AND event_name IS NOT NULL
          AND event_name <> ''
          AND JSONHas(toString(props), 'message')
          AND JSONExtractString(toString(props), 'message') <> ''
          ${filterStatement}
          ${timeStatement}
        GROUP BY value
    )
  `;

  if (isCountQuery) {
    return `
    WITH ${baseCteQuery}
    SELECT COUNT(*) as totalCount FROM ErrorStats;
    `;
  }

  return `
    WITH ${baseCteQuery}
    SELECT
        value,
        errorName,
        total_occurrences as count,
        unique_sessions as sessionCount,
        ROUND(
            unique_sessions * 100.0 / SUM(unique_sessions) OVER (),
            2
        ) as percentage
    FROM ErrorStats
    ORDER BY total_occurrences DESC
    ${limitStatement}
    ${offsetStatement}
  `;
};

export const getErrorNames = analyticsRoute<GetErrorNamesRequest>(
  "error names",
  async (req: FastifyRequest<GetErrorNamesRequest>, res: FastifyReply) => {
    const siteId = Number(req.params.siteId);
    const params = { siteId };
    const dataSpec = { query: buildErrorNamesQuery(req.query, siteId, false), params };

    if (req.query.page !== undefined) {
      const result = await runPaginatedQuery<ErrorNameItem>(dataSpec, {
        query: buildErrorNamesQuery(req.query, siteId, true),
        params,
      });
      return res.send({ data: result });
    }

    // For non-paginated (StandardSection default) use, return the simpler structure
    const items = await runAnalyticsQuery<ErrorNameItem>(dataSpec);
    return res.send({ data: items });
  }
);
