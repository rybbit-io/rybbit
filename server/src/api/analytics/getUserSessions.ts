import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getFilterStatement, getTimeStatement, processResults } from "./utils.js";

// Individual pageview type
type Pageview = {
  session_id: string;
  timestamp: string;
  pathname: string;
  querystring: string;
  page_title: string;
  referrer: string;
  browser: string;
  operating_system: string;
  device_type: string;
  country: string;
};

// Grouped session type to be returned to the client
type GroupedSession = {
  session_id: string;
  browser: string;
  operating_system: string;
  device_type: string;
  country: string;
  firstTimestamp: string;
  lastTimestamp: string;
  duration: number; // Duration in seconds
  pageviews: {
    pathname: string;
    querystring: string;
    title: string;
    timestamp: string;
    referrer: string;
  }[];
};

export interface GetUserSessionsRequest {
  Querystring: {
    startDate: string;
    endDate: string;
    timeZone: string;
    site: string;
    filters: string;
  };
  Params: {
    userId: string;
  };
}

export async function getUserSessions(req: FastifyRequest<GetUserSessionsRequest>, res: FastifyReply) {
  const { startDate, endDate, timeZone, site, filters } = req.query;
  const userId = req.params.userId;

  const filterStatement = getFilterStatement(filters);
  const timeStatement = getTimeStatement(req.query);

  const query = `
SELECT
    session_id,
    timestamp,
    pathname,
    querystring,
    page_title,
    referrer,
    browser,
    operating_system,
    device_type,
    country,
    region
FROM events
WHERE
    site_id = {siteId:Int32}
    AND user_id = {userId:String}
    ${filterStatement}
    ${timeStatement}
ORDER BY timestamp ASC
  `;

  try {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteId: Number(site),
        userId,
      },
    });

    const pageviews = await processResults<Pageview>(result);

    // Group pageviews by session
    const sessions: Record<string, GroupedSession> = {};

    pageviews.forEach(pageview => {
      const {
        session_id,
        timestamp,
        pathname,
        querystring,
        page_title,
        referrer,
        browser,
        operating_system,
        device_type,
        country,
      } = pageview;

      if (!sessions[session_id]) {
        sessions[session_id] = {
          session_id,
          browser,
          operating_system,
          device_type,
          country,
          firstTimestamp: timestamp,
          lastTimestamp: timestamp,
          duration: 0, // Initialize duration
          pageviews: [],
        };
      }

      // Update timestamps
      if (timestamp < sessions[session_id].firstTimestamp) {
        sessions[session_id].firstTimestamp = timestamp;
      }
      if (timestamp > sessions[session_id].lastTimestamp) {
        sessions[session_id].lastTimestamp = timestamp;
      }

      // Add pageview with separate pathname and querystring
      sessions[session_id].pageviews.push({
        pathname,
        querystring,
        title: page_title,
        timestamp,
        referrer,
      });

      // Sort pageviews by timestamp in descending order
      sessions[session_id].pageviews.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    });

    // Calculate duration for each session and convert to array
    const groupedSessions = Object.values(sessions)
      .map(session => {
        // Calculate duration in seconds
        const firstTime = new Date(session.firstTimestamp).getTime();
        const lastTime = new Date(session.lastTimestamp).getTime();
        session.duration = Math.round((lastTime - firstTime) / 1000);

        return session;
      })
      .sort((a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime());

    return res.send({ data: groupedSessions });
  } catch (error) {
    console.error("Error fetching user sessions:", error);
    return res.status(500).send({ error: "Failed to fetch user sessions" });
  }
}
