import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getUserHasAccessToSitePublic } from "../../lib/auth-utils.js";
import {
  getFilterStatement,
  getTimeStatement,
  processResults,
} from "./utils.js";
import { FilterParams } from "@rybbit/shared";

interface GetErrorEventsRequest {
  Params: {
    site: string;
  };
  Querystring: FilterParams<{
    errorName: string;
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
  operating_system: string | null;
  device_type: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  properties: string; // JSON string containing error details
};

// Structure for paginated response
type ErrorEventsPaginatedResponse = {
  data: ErrorEvent[];
  totalCount: number;
};

const getErrorEventsQuery = (
  request: FastifyRequest<GetErrorEventsRequest>,
  isCountQuery: boolean = false
) => {
  const {
    startDate,
    endDate,
    timeZone,
    filters,
    errorName,
    limit,
    page,
    pastMinutesStart,
    pastMinutesEnd,
  } = request.query;

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
  const limitStatement =
    !isCountQuery && validatedLimit
      ? `LIMIT ${validatedLimit}`
      : isCountQuery
        ? ""
        : "LIMIT 20";

  let validatedOffset: number | null = null;
  if (!isCountQuery && page !== undefined) {
    const parsedPage = parseInt(String(page), 10);
    if (!isNaN(parsedPage) && parsedPage >= 1) {
      const pageOffset = (parsedPage - 1) * (validatedLimit || 20);
      validatedOffset = pageOffset;
    }
  }
  const offsetStatement =
    !isCountQuery && validatedOffset ? `OFFSET ${validatedOffset}` : "";

  if (isCountQuery) {
    return `
      SELECT COUNT(*) as totalCount
      FROM events
      WHERE
        site_id = {siteId:Int32}
        AND type = 'error'
        AND event_name = {errorName:String}
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
        operating_system,
        device_type,
        country,
        city,
        region,
        toString(props) as properties
    FROM events
    WHERE
      site_id = {siteId:Int32}
      AND type = 'error'
      AND event_name = {errorName:String}
      ${filterStatement}
      ${timeStatement}
    ORDER BY timestamp DESC
    ${limitStatement}
    ${offsetStatement}
  `;
};

export async function getErrorEvents(
  req: FastifyRequest<GetErrorEventsRequest>,
  res: FastifyReply
) {
  const site = req.params.site;
  const { errorName, page } = req.query;

  if (!errorName) {
    return res.status(400).send({ error: "errorName parameter is required" });
  }

  const userHasAccessToSite = await getUserHasAccessToSitePublic(req, site);
  if (!userHasAccessToSite) {
    return res.status(403).send({ error: "Forbidden" });
  }

  const isPaginatedRequest = page !== undefined;

  const dataQuery = getErrorEventsQuery(req, false);

  try {
    const dataResult = await clickhouse.query({
      query: dataQuery,
      format: "JSONEachRow",
      query_params: {
        siteId: Number(site),
        errorName: errorName,
      },
    });
    const items = await processResults<ErrorEvent>(dataResult);

    // Debug logging to verify properties are being returned correctly
    if (items.length > 0) {
      console.log("Sample error event properties:", items[0].properties);
    }

    if (isPaginatedRequest) {
      const countQuery = getErrorEventsQuery(req, true);
      const countResult = await clickhouse.query({
        query: countQuery,
        format: "JSONEachRow",
        query_params: {
          siteId: Number(site),
          errorName: errorName,
        },
      });
      const countData = await processResults<{ totalCount: number }>(
        countResult
      );
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
