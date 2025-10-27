import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getFilterStatement, getTimeStatement, processResults } from "./utils.js";
import { FilterParams } from "@rybbit/shared";

interface GetErrorEventsRequest {
  Params: {
    site: string;
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

const getErrorEventsQuery = (request: FastifyRequest<GetErrorEventsRequest>, isCountQuery: boolean = false) => {
  const { startDate, endDate, timeZone, filters, errorMessage, limit, page, pastMinutesStart, pastMinutesEnd } =
    request.query;

  const filterStatement = getFilterStatement(filters);
  const timeStatement = getTimeStatement(request.query);

  let validatedLimit: number | null = null;
  if (!isCountQuery && limit !== undefined) {
    const parsedLimit = parseInt(String(limit), 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      validatedLimit = parsedLimit;
    }
  }
  // Default to 20 for error events
  const limitStatement = !isCountQuery && validatedLimit ? `LIMIT ${validatedLimit}` : isCountQuery ? "" : "LIMIT 20";

  let validatedOffset: number | null = null;
  if (!isCountQuery && page !== undefined) {
    const parsedPage = parseInt(String(page), 10);
    if (!isNaN(parsedPage) && parsedPage >= 1) {
      const pageOffset = (parsedPage - 1) * (validatedLimit || 20);
      validatedOffset = pageOffset;
    }
  }
  const offsetStatement = !isCountQuery && validatedOffset ? `OFFSET ${validatedOffset}` : "";

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

export async function getErrorEvents(req: FastifyRequest<GetErrorEventsRequest>, res: FastifyReply) {
  const site = req.params.site;
  const { errorMessage, page } = req.query;

  if (!errorMessage) {
    return res.status(400).send({ error: "errorMessage parameter is required" });
  }

  const isPaginatedRequest = page !== undefined;

  const dataQuery = getErrorEventsQuery(req, false);

  try {
    const dataResult = await clickhouse.query({
      query: dataQuery,
      format: "JSONEachRow",
      query_params: {
        siteId: Number(site),
        errorMessage: errorMessage,
      },
    });
    const items = await processResults<ErrorEvent>(dataResult);

    if (isPaginatedRequest) {
      const countQuery = getErrorEventsQuery(req, true);
      const countResult = await clickhouse.query({
        query: countQuery,
        format: "JSONEachRow",
        query_params: {
          siteId: Number(site),
          errorMessage: errorMessage,
        },
      });
      const countData = await processResults<{ totalCount: number }>(countResult);
      const totalCount = countData.length > 0 ? countData[0].totalCount : 0;
      return res.send({ data: { data: items, totalCount } });
    } else {
      return res.send({ data: items });
    }
  } catch (error) {
    console.error(`Error fetching error events:`, error);
    console.error("Failed dataQuery:", dataQuery);
    if (isPaginatedRequest) {
      const countQuery = getErrorEventsQuery(req, true);
      console.error("Failed countQuery:", countQuery);
    }
    return res.status(500).send({ error: `Failed to fetch error events` });
  }
}
