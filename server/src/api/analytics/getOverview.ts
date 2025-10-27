import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getUserHasAccessToSitePublic } from "../../lib/auth-utils.js";
import { getFilterStatement, getTimeStatement, processResults } from "./utils.js";

type GetOverviewResponse = {
  sessions: number;
  pageviews: number;
  users: number;
  pages_per_session: number;
  bounce_rate: number;
  session_duration: number;
};

const getQuery = (params: FilterParams) => {
  const filterStatement = getFilterStatement(params.filters);
  const timeStatement = getTimeStatement(params);

  return `
    WITH
    -- First, calculate total pageviews per session (no filters except time)
    AllSessionPageviews AS (
        SELECT
            session_id,
            COUNT(CASE WHEN type = 'pageview' THEN 1 END) AS total_pageviews_in_session
        FROM events
        WHERE
            site_id = {siteId:Int32}
            ${timeStatement}
        GROUP BY session_id
    ),
    -- Then get session data with filters applied
    FilteredSessions AS (
        SELECT
            session_id,
            MIN(timestamp) AS start_time,
            MAX(timestamp) AS end_time
        FROM events
        WHERE
            site_id = {siteId:Int32}
            ${filterStatement}
            ${timeStatement}
        GROUP BY session_id
    ),
    -- Join to get sessions with their total pageviews
    SessionsWithPageviews AS (
        SELECT
            fs.session_id,
            fs.start_time,
            fs.end_time,
            asp.total_pageviews_in_session
        FROM FilteredSessions fs
        LEFT JOIN AllSessionPageviews asp ON fs.session_id = asp.session_id
    )
    SELECT
        session_stats.sessions,
        session_stats.pages_per_session,
        session_stats.bounce_rate * 100 AS bounce_rate,
        session_stats.session_duration,
        page_stats.pageviews,
        page_stats.users
    FROM
    (
        -- Session-level metrics
        SELECT
            COUNT() AS sessions,
            AVG(total_pageviews_in_session) AS pages_per_session,
            sumIf(1, total_pageviews_in_session = 1) / COUNT() AS bounce_rate,
            AVG(end_time - start_time) AS session_duration
        FROM SessionsWithPageviews
    ) AS session_stats
    CROSS JOIN
    (
        -- Page-level and user-level metrics
        SELECT
            COUNT(CASE WHEN type = 'pageview' THEN 1 END) AS pageviews,
            COUNT(DISTINCT user_id)    AS users
        FROM events
        WHERE
            site_id = {siteId:Int32}
            ${filterStatement}
            ${timeStatement}
            -- AND type = 'pageview'
    ) AS page_stats`;
};

export interface OverviewRequest {
  Params: {
    site: string;
  };
  Querystring: FilterParams;
}

export async function getOverview(req: FastifyRequest<OverviewRequest>, res: FastifyReply) {
  const { startDate, endDate, timeZone, filters, pastMinutesStart, pastMinutesEnd } = req.query;
  const site = req.params.site;

  const query = getQuery({
    startDate,
    endDate,
    timeZone,
    filters,
    pastMinutesStart,
    pastMinutesEnd,
  });

  try {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteId: Number(site),
      },
    });

    const data = await processResults<GetOverviewResponse>(result);
    return res.send({ data: data[0] });
  } catch (error) {
    console.error("Error fetching overview:", error);
    return res.status(500).send({ error: "Failed to fetch overview" });
  }
}
