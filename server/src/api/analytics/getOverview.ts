import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getFilterStatement } from "./utils/getFilterStatement.js";
import { getTimeStatement, processResults } from "./utils/utils.js";

type GetOverviewResponse = {
  sessions: number;
  pageviews: number;
  users: number;
  pages_per_session: number;
  bounce_rate: number;
  session_duration: number;
};

const getQuery = (params: FilterParams, siteId: number) => {
  const timeStatement = getTimeStatement(params);
  const filterStatement = getFilterStatement(params.filters, siteId, timeStatement);
  const hasFilter = filterStatement.trim().length > 0;

  if (!hasFilter) {
    // Single scan: no filter means AllSessionPageviews === FilteredSessions
    return `
      WITH SessionMetrics AS (
          SELECT
              session_id,
              anyLast(user_id) AS user_id,
              MIN(timestamp) AS start_time,
              MAX(timestamp) AS end_time,
              countIf(type = 'pageview') AS total_pageviews_in_session
          FROM events
          WHERE
              site_id = {siteId:Int32}
              ${timeStatement}
          GROUP BY session_id
      )
      SELECT
          COUNT() AS sessions,
          AVG(total_pageviews_in_session) AS pages_per_session,
          sumIf(1, total_pageviews_in_session = 1) / COUNT() * 100 AS bounce_rate,
          AVG(end_time - start_time) AS session_duration,
          SUM(total_pageviews_in_session) AS pageviews,
          COUNT(DISTINCT user_id) AS users
      FROM SessionMetrics`;
  }

  // Two scans (down from three):
  // 1. AllSessionPageviews — unfiltered, for accurate bounce rate / pages_per_session
  // 2. FilteredSessionsWithStats — filtered, provides session timing + pageviews + users
  return `
    WITH
    AllSessionPageviews AS (
        SELECT
            session_id,
            countIf(type = 'pageview') AS total_pageviews_in_session
        FROM events
        WHERE
            site_id = {siteId:Int32}
            ${timeStatement}
        GROUP BY session_id
    ),
    FilteredSessionsWithStats AS (
        SELECT
            session_id,
            anyLast(user_id) AS user_id,
            MIN(timestamp) AS start_time,
            MAX(timestamp) AS end_time,
            countIf(type = 'pageview') AS filtered_pageviews
        FROM events
        WHERE
            site_id = {siteId:Int32}
            ${filterStatement}
            ${timeStatement}
        GROUP BY session_id
    )
    SELECT
        COUNT() AS sessions,
        AVG(asp.total_pageviews_in_session) AS pages_per_session,
        sumIf(1, asp.total_pageviews_in_session = 1) / COUNT() * 100 AS bounce_rate,
        AVG(f.end_time - f.start_time) AS session_duration,
        SUM(f.filtered_pageviews) AS pageviews,
        COUNT(DISTINCT f.user_id) AS users
    FROM FilteredSessionsWithStats f
    LEFT JOIN AllSessionPageviews asp ON f.session_id = asp.session_id`;
};

export interface OverviewRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams;
}

export async function getOverview(req: FastifyRequest<OverviewRequest>, res: FastifyReply) {
  const { start_date, end_date, time_zone, filters, past_minutes_start, past_minutes_end } = req.query;
  const site = req.params.siteId;

  const query = getQuery(
    {
      start_date,
      end_date,
      time_zone,
      filters,
      past_minutes_start,
      past_minutes_end,
    },
    Number(site)
  );

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
