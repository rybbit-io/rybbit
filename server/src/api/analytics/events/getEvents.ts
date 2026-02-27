import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { processResults, getTimeStatement } from "../utils/utils.js";
import { FilterParams } from "@rybbit/shared";
import { getFilterStatement } from "../utils/getFilterStatement.js";

export type GetEventsResponse = {
  timestamp: string;
  event_name: string;
  properties: string;
  session_id: string;
  user_id: string;
  identified_user_id: string;
  pathname: string;
  querystring: string;
  hostname: string;
  referrer: string;
  browser: string;
  browser_version: string;
  operating_system: string;
  operating_system_version: string;
  language: string;
  country: string;
  region: string;
  city: string;
  lat: number;
  lon: number;
  screen_width: number;
  screen_height: number;
  device_type: string;
  type: string;
  page_title: string;
}[];

interface GetEventsRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    page_size?: string;
    since_timestamp?: string;
    before_timestamp?: string;
  }>;
}

const EVENT_COLUMNS = `
  timestamp,
  event_name,
  toString(props) as properties,
  session_id,
  user_id,
  identified_user_id,
  pathname,
  querystring,
  hostname,
  page_title,
  referrer,
  browser,
  browser_version,
  operating_system,
  operating_system_version,
  language,
  country,
  region,
  city,
  lat,
  lon,
  screen_width,
  screen_height,
  device_type,
  type
`;

const EVENT_TYPE_FILTER = `AND type IN ('custom_event', 'pageview', 'outbound', 'button_click', 'copy', 'form_submit', 'input_change')`;

export async function getEvents(
  req: FastifyRequest<GetEventsRequest>,
  res: FastifyReply
) {
  const { siteId } = req.params;
  const {
    since_timestamp,
    before_timestamp,
    page_size: pageSize = "50",
    filters,
  } = req.query;

  const limit = parseInt(pageSize, 10);
  const filterStatement = filters
    ? getFilterStatement(filters, Number(siteId))
    : "";

  try {
    // Mode A: Poll for new events since a timestamp (Realtime polling)
    if (since_timestamp) {
      const query = `
        SELECT ${EVENT_COLUMNS}
        FROM events
        WHERE
          site_id = {siteId:Int32}
          ${EVENT_TYPE_FILTER}
          AND timestamp > toDateTime64({sinceTimestamp:String}, 3)
          ${filterStatement}
        ORDER BY timestamp DESC
        LIMIT 500
      `;

      const result = await clickhouse.query({
        query,
        format: "JSONEachRow",
        query_params: {
          siteId: Number(siteId),
          sinceTimestamp: since_timestamp,
        },
      });

      const events = await processResults<GetEventsResponse[number]>(result);
      return res.send({ data: events });
    }

    // Mode B: Cursor-based pagination (initial load or scrolling back)
    const timeStatement =
      req.query.start_date || req.query.end_date
        ? getTimeStatement(req.query)
        : "";

    let cursorCondition = "";
    const queryParams: Record<string, string | number> = {
      siteId: Number(siteId),
      limit: Number(limit),
    };

    if (before_timestamp) {
      cursorCondition = `AND timestamp < toDateTime64({beforeTimestamp:String}, 3)`;
      queryParams.beforeTimestamp = before_timestamp;
    }

    const query = `
      SELECT ${EVENT_COLUMNS}
      FROM events
      WHERE
        site_id = {siteId:Int32}
        ${EVENT_TYPE_FILTER}
        ${timeStatement}
        ${cursorCondition}
        ${filterStatement}
      ORDER BY timestamp DESC
      LIMIT {limit:Int32}
    `;

    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: queryParams,
    });

    const events = await processResults<GetEventsResponse[number]>(result);


    return res.send({
      data: events,
      cursor: {
        hasMore: events.length === limit,
        oldestTimestamp:
          events.length > 0 ? events[events.length - 1].timestamp : null,
      },
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return res.status(500).send({ error: "Failed to fetch events" });
  }
}
