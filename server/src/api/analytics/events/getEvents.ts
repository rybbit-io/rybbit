import { FastifyReply, FastifyRequest } from "fastify";
import { enrichWithTraits } from "../utils/utils.js";
import { getTimeStatement } from "../utils/timeWindow.js";
import { FilterParams } from "@rybbit/shared";
import { getFilterStatement } from "../utils/getFilterStatement.js";
import { analyticsRoute, QuerySpec, runAnalyticsQuery } from "../utils/analyticsQuery.js";

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
  device_model: string;
  app_version: string;
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
  type,
  device_model,
  app_version
`;

const EVENT_TYPE_FILTER = `AND type IN ('custom_event', 'pageview', 'outbound', 'button_click', 'copy', 'form_submit', 'input_change')`;

export const buildEventsQuery = (query: GetEventsRequest["Querystring"], siteId: number): QuerySpec => {
  const { since_timestamp, before_timestamp, page_size: pageSize = "50", filters } = query;

  const limit = parseInt(pageSize, 10);
  // The event log filters individual rows; only channel remains session-attributed.
  const filterStatement = filters
    ? getFilterStatement(filters, siteId, undefined, { sessionLevelParams: ["channel"] })
    : "";

  // Mode A: Poll for new events since a timestamp (Realtime polling)
  if (since_timestamp) {
    return {
      query: `
        SELECT ${EVENT_COLUMNS}
        FROM events
        WHERE
          site_id = {siteId:Int32}
          ${EVENT_TYPE_FILTER}
          AND timestamp > toDateTime64({sinceTimestamp:String}, 3)
          ${filterStatement}
        ORDER BY timestamp DESC
        LIMIT 500
      `,
      params: {
        siteId,
        sinceTimestamp: since_timestamp,
      },
    };
  }

  // Mode B: Cursor-based pagination (initial load or scrolling back)
  const timeStatement = query.start_date || query.end_date ? getTimeStatement(query) : "";

  let cursorCondition = "";
  const queryParams: Record<string, string | number> = {
    siteId,
    limit: Number(limit),
  };

  if (before_timestamp) {
    cursorCondition = `AND timestamp < toDateTime64({beforeTimestamp:String}, 3)`;
    queryParams.beforeTimestamp = before_timestamp;
  }

  return {
    query: `
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
    `,
    params: queryParams,
  };
};

export const getEvents = analyticsRoute<GetEventsRequest>(
  "events",
  async (req: FastifyRequest<GetEventsRequest>, res: FastifyReply) => {
    const { siteId } = req.params;
    const { since_timestamp, page_size: pageSize = "50" } = req.query;

    const events = await runAnalyticsQuery<GetEventsResponse[number]>(buildEventsQuery(req.query, Number(siteId)));
    const eventsWithTraits = await enrichWithTraits(events, Number(siteId));

    // Mode A: Poll for new events since a timestamp (Realtime polling)
    if (since_timestamp) {
      return res.send({ data: eventsWithTraits });
    }

    // Mode B: Cursor-based pagination (initial load or scrolling back)
    const limit = parseInt(pageSize, 10);
    return res.send({
      data: eventsWithTraits,
      cursor: {
        hasMore: events.length === limit,
        oldestTimestamp: events.length > 0 ? events[events.length - 1].timestamp : null,
      },
    });
  }
);
