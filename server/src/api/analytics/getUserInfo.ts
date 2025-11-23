import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { processResults } from "./utils.js";

interface UserPageviewData {
  sessions: number;
  duration: number;
  country: string;
  region: string;
  city: string;
  language: string;
  device_type: string;
  browser: string;
  browser_version: string;
  operating_system: string;
  operating_system_version: string;
  screen_height: number;
  screen_width: number;
  last_seen: string;
  first_seen: string;
  pageviews: number;
  events: number;
  ip: string;
}

export async function getUserInfo(
  req: FastifyRequest<{
    Params: {
      site: string;
      userId: string;
    };
  }>,
  res: FastifyReply
) {
  const { userId, site } = req.params;

  try {
    const queryResult = await clickhouse.query({
      query: `
    WITH sessions AS (
        SELECT
            session_id,
            user_id,
            argMax(country, timestamp) AS country,
            argMax(region, timestamp) AS region,
            argMax(city, timestamp) AS city,
            argMax(language, timestamp) AS language,
            argMax(device_type, timestamp) AS device_type,
            argMax(browser, timestamp) AS browser,
            argMax(browser_version, timestamp) AS browser_version,
            argMax(operating_system, timestamp) AS operating_system,
            argMax(operating_system_version, timestamp) AS operating_system_version,
            argMax(screen_width, timestamp) AS screen_width,
            argMax(screen_height, timestamp) AS screen_height,
            argMin(referrer, timestamp) AS referrer,
            MAX(timestamp) AS session_end,
            MIN(timestamp) AS session_start,
            dateDiff('second', MIN(timestamp), MAX(timestamp)) AS session_duration,
            argMinIf(pathname, timestamp, type = 'pageview') AS entry_page,
            argMaxIf(pathname, timestamp, type = 'pageview') AS exit_page,
            countIf(type = 'pageview') AS pageviews,
            countIf(type = 'custom_event') AS events,
            argMax(ip, timestamp) AS ip
        FROM
            events
        WHERE
            user_id = {userId:String}
            AND site_id = {site:Int32}
        GROUP BY
            session_id,
            user_id
        ORDER BY
            session_end DESC
    )
    SELECT
        COUNT(DISTINCT session_id) AS sessions,
        ROUND(avg(session_duration)) AS duration,
        any(country) as country,
        any(region) AS region,
        any(city) AS city,
        any(language) AS language,
        any(device_type) AS device_type,
        any(browser) AS browser,
        any(browser_version) AS browser_version,
        any(operating_system) AS operating_system,
        any(operating_system_version) AS operating_system_version,
        any(screen_height) AS screen_height,
        any(screen_width) AS screen_width,
        MAX(session_end) AS last_seen,
        MIN(session_start) AS first_seen,
        SUM(pageviews) AS pageviews,
        SUM(events) AS events,
        any(ip) AS ip
    FROM
        sessions
      `,
      query_params: {
        userId,
        site,
      },
      format: "JSONEachRow",
    });

    const data = await processResults<UserPageviewData>(queryResult);

    // If no data found for user
    if (data.length === 0) {
      return res.status(404).send({
        error: "User not found",
      });
    }

    return res.send({ data: data[0] });
  } catch (error) {
    console.error("Error fetching user info:", error);
    return res.status(500).send({
      error: "Internal server error",
    });
  }
}
