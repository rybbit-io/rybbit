import { FastifyReply, FastifyRequest } from "fastify";
import { getTimeStatement } from "./utils/utils.js";
import { FilterParams } from "@rybbit/shared";
import { getFilterStatement } from "./utils/getFilterStatement.js";
import { analyticsRoute, getPaginationStatements, runAnalyticsQuery, runPaginatedQuery } from "./utils/analyticsQuery.js";

interface GetErrorEventsRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    errorMessage: string;
    limit?: number;
    page?: number;
  }>;
}

// This type represents a single error event
export type ErrorEvent = {
  timestamp: string;
  session_id: string;
  user_id: string | null;
  pathname: string | null;
  hostname: string | null;
  page_title: string | null;
  referrer: string | null;
  browser: string | null;
  browser_version: string | null;
  operating_system: string | null;
  operating_system_version: string | null;
  device_type: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  // Parsed error properties
  message: string;
  stack: string | null;
  fileName: string | null;
  lineNumber: number | null;
  columnNumber: number | null;
};

// Structure for paginated response
type ErrorEventsPaginatedResponse = {
  data: ErrorEvent[];
  totalCount: number;
};

export const buildErrorEventsQuery = (
  query: GetErrorEventsRequest["Querystring"],
  siteId: number,
  isCountQuery: boolean = false
) => {
  const { filters } = query;

  const timeStatement = getTimeStatement(query);
  const filterStatement = getFilterStatement(filters, siteId, timeStatement);

  // Default to 20 for error events
  const { limitStatement, offsetStatement } = getPaginationStatements(query, 20, isCountQuery);

  if (isCountQuery) {
    return `
      SELECT COUNT(*) as totalCount
      FROM events
      WHERE
        site_id = {siteId:Int32}
        AND type = 'error'
        AND JSONExtractString(toString(props), 'message') = {errorMessage:String}
        ${filterStatement}
        ${timeStatement}
    `;
  }

  return `
    SELECT
        timestamp,
        session_id,
        user_id,
        pathname,
        hostname,
        page_title,
        referrer,
        browser,
        browser_version,
        operating_system,
        operating_system_version,
        device_type,
        country,
        city,
        region,
        JSONExtractString(toString(props), 'message') as message,
        JSONExtractString(toString(props), 'stack') as stack,
        COALESCE(
          JSONExtractString(toString(props), 'fileName'),
          JSONExtractString(toString(props), 'filename')
        ) as fileName,
        CASE
          WHEN JSONHas(toString(props), 'lineNumber') THEN JSONExtractInt(toString(props), 'lineNumber')
          WHEN JSONHas(toString(props), 'lineno') THEN JSONExtractInt(toString(props), 'lineno')
          ELSE NULL
        END as lineNumber,
        CASE
          WHEN JSONHas(toString(props), 'columnNumber') THEN JSONExtractInt(toString(props), 'columnNumber')
          WHEN JSONHas(toString(props), 'colno') THEN JSONExtractInt(toString(props), 'colno')
          ELSE NULL
        END as columnNumber
    FROM events
    WHERE
      site_id = {siteId:Int32}
      AND type = 'error'
      AND JSONExtractString(toString(props), 'message') = {errorMessage:String}
      ${filterStatement}
      ${timeStatement}
    ORDER BY timestamp DESC
    ${limitStatement}
    ${offsetStatement}
  `;
};

export const getErrorEvents = analyticsRoute<GetErrorEventsRequest>(
  "error events",
  async (req: FastifyRequest<GetErrorEventsRequest>, res: FastifyReply) => {
    const { errorMessage } = req.query;

    if (!errorMessage) {
      return res.status(400).send({ error: "errorMessage parameter is required" });
    }

    const siteId = Number(req.params.siteId);
    const params = { siteId, errorMessage };
    const dataSpec = { query: buildErrorEventsQuery(req.query, siteId, false), params };

    if (req.query.page !== undefined) {
      const result = await runPaginatedQuery<ErrorEvent>(dataSpec, {
        query: buildErrorEventsQuery(req.query, siteId, true),
        params,
      });
      return res.send({ data: result });
    }

    const items = await runAnalyticsQuery<ErrorEvent>(dataSpec);
    return res.send({ data: items });
  }
);
