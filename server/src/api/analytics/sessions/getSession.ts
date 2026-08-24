import { FastifyReply, FastifyRequest } from "fastify";
import { SESSION_CHANNEL_AGG, SESSION_REFERRER_AGG } from "../utils/sessionAttribution.js";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";

export interface SessionDetails {
  session_id: string;
  user_id: string;
  country: string;
  region: string;
  city: string;
  language: string;
  device_type: string;
  device_model: string;
  app_version: string;
  browser: string;
  browser_version: string;
  operating_system: string;
  operating_system_version: string;
  screen_width: number;
  screen_height: number;
  referrer: string;
  channel: string;
  session_end: string;
  session_start: string;
  session_duration: number;
  pageviews: number;
  events: number;
  entry_page: string;
  exit_page: string;
  ip: string;
}

export interface Event {
  timestamp: string;
  pathname: string;
  hostname: string;
  querystring: string;
  page_title: string;
  referrer: string;
  type: string;
  event_name?: string;
  properties?: string;
}

export interface SessionPageviewsAndEvents {
  session: SessionDetails;
  events: Event[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface GetSessionRequest {
  Params: {
    sessionId: string;
    siteId: string;
  };
  Querystring: {
    limit?: string;
    offset?: string;
    minutes?: string;
  };
}

export const buildSessionQueries = (query: GetSessionRequest["Querystring"]) => {
  const minutes = query.minutes ? parseInt(query.minutes) : undefined;

  // Add time filter if minutes is provided
  const timeFilter = minutes ? `timestamp > now() - interval ${minutes} minute` : "";

  // Add the WHERE clause connector if timeFilter exists
  const timeFilterWithConnector = timeFilter ? `AND ${timeFilter}` : "";

  // 1. First query: Get session data derived from events
  const sessionQuery = `
SELECT
    session_id,
    any(user_id) as user_id,
    any(country) as country,
    any(region) as region,
    any(city) as city,
    any(language) as language,
    any(device_type) as device_type,
    any(device_model) as device_model,
    any(app_version) as app_version,
    any(browser) as browser,
    any(browser_version) as browser_version,
    any(operating_system) as operating_system,
    any(operating_system_version) as operating_system_version,
    any(screen_width) as screen_width,
    any(screen_height) as screen_height,
    ${SESSION_REFERRER_AGG} as referrer,
    ${SESSION_CHANNEL_AGG} as channel,
    min(timestamp) as session_start,
    max(timestamp) as session_end,
    dateDiff('second', min(timestamp), max(timestamp)) as session_duration,
    countIf(type = 'pageview') as pageviews,
    count() as events,
    argMinIf(pathname, timestamp, type = 'pageview') as entry_page,
    argMaxIf(pathname, timestamp, type = 'pageview') as exit_page,
    any(ip) AS ip
FROM events
WHERE
    site_id = {siteId:Int32}
    AND session_id = {sessionId:String}
    ${timeFilterWithConnector}
GROUP BY session_id
LIMIT 1
    `;

  // 2. Query to get total count of pageviews
  const countQuery = `
SELECT
    COUNT(*) as total
FROM events
WHERE
    site_id = {siteId:Int32}
    AND session_id = {sessionId:String}
    AND type != 'performance'
    ${timeFilterWithConnector}
    `;

  // 3. Query to get paginated pageviews
  const eventsQuery = `
SELECT
    timestamp,
    pathname,
    hostname,
    querystring,
    page_title,
    referrer,
    type,
    event_name,
    props
FROM events
WHERE
    site_id = {siteId:Int32}
    AND session_id = {sessionId:String}
    AND type != 'performance'
    ${timeFilterWithConnector}
ORDER BY timestamp ASC
LIMIT {limit:Int32}
OFFSET {offset:Int32}
    `;

  return { sessionQuery, countQuery, eventsQuery };
};

export const getSession = analyticsRoute<GetSessionRequest>(
  "session data",
  async (req: FastifyRequest<GetSessionRequest>, res: FastifyReply) => {
    const { sessionId, siteId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;

    const { sessionQuery, countQuery, eventsQuery } = buildSessionQueries(req.query);

    // Execute queries in parallel
    const [sessionData, countData, eventsData] = await Promise.all([
      runAnalyticsQuery<SessionDetails>({
        query: sessionQuery,
        params: {
          siteId: Number(siteId),
          sessionId,
        },
      }),
      runAnalyticsQuery<{ total: number }>({
        query: countQuery,
        params: {
          siteId: Number(siteId),
          sessionId,
        },
      }),
      runAnalyticsQuery<Event>({
        query: eventsQuery,
        params: {
          siteId: Number(siteId),
          sessionId,
          limit,
          offset,
        },
      }),
    ]);

    if (!sessionData || sessionData.length === 0) {
      return res.status(404).send({ error: "Session not found" });
    }

    // Combine results
    const response: SessionPageviewsAndEvents = {
      session: sessionData[0],
      events: eventsData,
      pagination: {
        total: countData[0].total,
        limit,
        offset,
        hasMore: offset + eventsData.length < countData[0].total,
      },
    };

    return res.send({ data: response });
  }
);
