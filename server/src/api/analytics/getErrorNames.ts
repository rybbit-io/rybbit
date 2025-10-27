import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getFilterStatement, getTimeStatement, processResults } from "./utils.js";
import { FilterParams } from "@rybbit/shared";

interface GetErrorNamesRequest {
  Params: {
    site: string;
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

const getErrorNamesQuery = (request: FastifyRequest<GetErrorNamesRequest>, isCountQuery: boolean = false) => {
  const { filters, limit, page } = request.query;

  const filterStatement = getFilterStatement(filters);
  const timeStatement = getTimeStatement(request.query);

  let validatedLimit: number | null = null;
  if (!isCountQuery && limit !== undefined) {
    const parsedLimit = parseInt(String(limit), 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      validatedLimit = parsedLimit;
    }
  }
  // Default to 10 for non-paginated use
  const limitStatement = !isCountQuery && validatedLimit ? `LIMIT ${validatedLimit}` : isCountQuery ? "" : "LIMIT 10";

  let validatedOffset: number | null = null;
  if (!isCountQuery && page !== undefined) {
    const parsedPage = parseInt(String(page), 10);
    if (!isNaN(parsedPage) && parsedPage >= 1) {
      const pageOffset = (parsedPage - 1) * (validatedLimit || 10);
      validatedOffset = pageOffset;
    }
  }
  const offsetStatement = !isCountQuery && validatedOffset ? `OFFSET ${validatedOffset}` : "";

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

export async function getErrorNames(req: FastifyRequest<GetErrorNamesRequest>, res: FastifyReply) {
  const site = req.params.site;
  const { page } = req.query;

  const isPaginatedRequest = page !== undefined; // True if page is present

  const dataQuery = getErrorNamesQuery(req, false);

  try {
    const dataResult = await clickhouse.query({
      query: dataQuery,
      format: "JSONEachRow",
      query_params: {
        siteId: Number(site),
      },
    });
    const items = await processResults<ErrorNameItem>(dataResult);

    if (isPaginatedRequest) {
      const countQuery = getErrorNamesQuery(req, true);
      const countResult = await clickhouse.query({
        query: countQuery,
        format: "JSONEachRow",
        query_params: {
          siteId: Number(site),
        },
      });
      const countData = await processResults<{ totalCount: number }>(countResult);
      const totalCount = countData.length > 0 ? countData[0].totalCount : 0;
      return res.send({ data: { data: items, totalCount } });
    } else {
      // For non-paginated (StandardSection default) use, return the simpler structure
      return res.send({ data: items });
    }
  } catch (error) {
    console.error(`Error fetching error names:`, error);
    console.error("Failed dataQuery:", dataQuery);
    if (isPaginatedRequest) {
      const countQuery = getErrorNamesQuery(req, true);
      console.error("Failed countQuery:", countQuery);
    }
    return res.status(500).send({ error: `Failed to fetch error names` });
  }
}
