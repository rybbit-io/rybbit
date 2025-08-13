import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getUserHasAccessToSitePublic } from "../../lib/auth-utils.js";
import { processResults } from "./utils.js";

export interface SessionDetails {
  session_id: string;
  user_id: string;
  country: string;
  region: string;
  city: string;
  language: string;
  device_type: string;
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
    site: string;
  };
  Querystring: {
    limit?: string;
    offset?: string;
    minutes?: string;
  };
}

export async function getSession(
  req: FastifyRequest<GetSessionRequest>,
  res: FastifyReply
) {
  const { sessionId, site } = req.params;
  const limit = req.query.limit ? parseInt(req.query.limit) : 100;
  const offset = req.query.offset ? parseInt(req.query.offset) : 0;
  const minutes = req.query.minutes ? parseInt(req.query.minutes) : undefined;

  const userHasAccessToSite = await getUserHasAccessToSitePublic(req, site);
  if (!userHasAccessToSite) {
    return res.status(403).send({ error: "Forbidden" });
  }

  // Add time filter if minutes is provided
  const timeFilter = minutes
    ? `timestamp > now() - interval ${minutes} minute`
    : "";

  // Add the WHERE clause connector if timeFilter exists
  const timeFilterWithConnector = timeFilter ? `AND ${timeFilter}` : "";

  try {
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
    any(browser) as browser,
    any(browser_version) as browser_version,
    any(operating_system) as operating_system,
    any(operating_system_version) as operating_system_version,
    any(screen_width) as screen_width,
    any(screen_height) as screen_height,
    any(referrer) as referrer,
    any(channel) as channel,
    min(timestamp) as session_start,
    max(timestamp) as session_end,
    dateDiff('second', min(timestamp), max(timestamp)) as session_duration,
    countIf(type = 'pageview') as pageviews,
    count() as events,
    argMinIf(pathname, timestamp, type = 'pageview') as entry_page,
    argMaxIf(pathname, timestamp, type = 'pageview') as exit_page
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

    // Execute queries in parallel
    const [sessionResultSettled, countResultSettled, eventsResultSettled] =
      await Promise.allSettled([
        clickhouse.query({
          query: sessionQuery,
          format: "JSONEachRow",
          query_params: {
            siteId: Number(site),
            sessionId,
          },
        }),
        clickhouse.query({
          query: countQuery,
          format: "JSONEachRow",
          query_params: {
            siteId: Number(site),
            sessionId,
          },
        }),
        clickhouse.query({
          query: eventsQuery,
          format: "JSONEachRow",
          query_params: {
            siteId: Number(site),
            sessionId,
            limit,
            offset,
          },
        }),
      ]);

    // Check if queries were successful
    if (sessionResultSettled.status === "rejected") {
      throw sessionResultSettled.reason;
    }
    if (countResultSettled.status === "rejected") {
      throw countResultSettled.reason;
    }
    if (eventsResultSettled.status === "rejected") {
      throw eventsResultSettled.reason;
    }

    const sessionResult = sessionResultSettled.value;
    const countResult = countResultSettled.value;
    const eventsResult = eventsResultSettled.value;

    const sessionData = await processResults<SessionDetails>(sessionResult);
    const countData = await processResults<{ total: number }>(countResult);
    const eventsData = await processResults<Event>(eventsResult);

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
  } catch (error) {
    console.error("Error fetching session data:", error);
    return res.status(500).send({ error: "Failed to fetch session data" });
  }
}
