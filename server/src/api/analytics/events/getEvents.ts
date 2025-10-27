import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { processResults, getTimeStatement, getFilterStatement } from "../utils.js";
import { FilterParams } from "@rybbit/shared";

export type GetEventsResponse = {
  timestamp: string;
  event_name: string;
  properties: string; // This will be populated from the props column
  user_id: string;
  pathname: string;
  querystring: string;
  hostname: string;
  referrer: string;
  browser: string;
  operating_system: string;
  country: string;
  device_type: string;
  type: string;
  page_title: string;
}[];

interface GetEventsRequest {
  Params: {
    site: string;
  };
  Querystring: FilterParams<{
    page?: string;
    pageSize?: string;
    count?: string; // Keeping for backward compatibility
  }>;
}

export async function getEvents(req: FastifyRequest<GetEventsRequest>, res: FastifyReply) {
  const { site } = req.params;
  const { startDate, endDate, timeZone, filters, page = "1", pageSize = "20", count } = req.query;

  // Use count if provided (for backward compatibility), otherwise use pageSize
  const limit = count ? parseInt(count, 10) : parseInt(pageSize, 10);
  const offset = (parseInt(page, 10) - 1) * limit;

  // Get time and filter statements if parameters are provided
  const timeStatement =
    startDate || endDate ? getTimeStatement(req.query) : "AND timestamp > now() - INTERVAL 30 MINUTE"; // Default to last 30 minutes if no time range specified

  const filterStatement = filters ? getFilterStatement(filters) : "";

  try {
    // First, get the total count for pagination metadata
    const countQuery = `
      SELECT
        COUNT(*) as total
      FROM events
      WHERE
        site_id = {siteId:Int32}
        AND (type = 'custom_event' OR type = 'pageview' OR type = 'outbound')
        ${timeStatement}
        ${filterStatement}
    `;

    const countResult = await clickhouse.query({
      query: countQuery,
      format: "JSONEachRow",
      query_params: {
        siteId: Number(site),
      },
    });

    const countData = await processResults<{ total: number }>(countResult);
    const totalCount = countData[0]?.total || 0;

    // Then, get the actual events with pagination
    const eventsQuery = `
      SELECT
        timestamp,
        event_name,
        toString(props) as properties, -- Convert props Map to string
        user_id,
        pathname,
        querystring,
        hostname,
        page_title,
        referrer,
        browser,
        operating_system,
        country,
        device_type,
        type
      FROM events
      WHERE
        site_id = {siteId:Int32}
        AND (type = 'custom_event' OR type = 'pageview' OR type = 'outbound')
        ${timeStatement}
        ${filterStatement}
      ORDER BY timestamp DESC
      LIMIT {limit:Int32} OFFSET {offset:Int32}
    `;

    const eventsResult = await clickhouse.query({
      query: eventsQuery,
      format: "JSONEachRow",
      query_params: {
        siteId: Number(site),
        limit: Number(limit),
        offset: Number(offset),
      },
    });

    const events = await processResults<GetEventsResponse[number]>(eventsResult);

    return res.send({
      data: events,
      pagination: {
        total: totalCount,
        page: parseInt(page, 10),
        pageSize: limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return res.status(500).send({ error: "Failed to fetch events" });
  }
}
