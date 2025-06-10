import { FastifyReply, FastifyRequest } from "fastify";
import clickhouse from "../../db/clickhouse/clickhouse.js";
import {
  getFilterStatement,
  getTimeStatement,
  processResults,
} from "./utils.js";
import { getUserHasAccessToSitePublic } from "../../lib/auth-utils.js";
import { FilterParameter } from "./types.js";
import { FilterParams } from "@rybbit/shared";

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

  return `SELECT
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
            AVG(pages_in_session) AS pages_per_session,
            sumIf(1, pages_in_session = 1) / COUNT() AS bounce_rate,
            AVG(end_time - start_time) AS session_duration
        FROM
            (
                -- One row per session
                SELECT
                    session_id,
                    MIN(timestamp) AS start_time,
                    MAX(timestamp) AS end_time,
                    COUNT(CASE WHEN type = 'pageview' THEN 1 END) AS pages_in_session
                FROM events
                WHERE
                    site_id = {siteId:Int32}
                    ${filterStatement}
                    ${getTimeStatement(params)}
                GROUP BY session_id
            )
        ) AS session_stats
        CROSS JOIN
        (
            -- Page-level and user-level metrics
            SELECT
                COUNT(*)                   AS pageviews,
                COUNT(DISTINCT user_id)    AS users
            FROM events
            WHERE 
                site_id = {siteId:Int32}
                ${filterStatement}
                ${getTimeStatement(params)}
                AND type = 'pageview'
        ) AS page_stats`;
};

export interface OverviewRequest {
  Params: {
    site: string;
  };
  Querystring: FilterParams;
}

export async function getOverview(
  req: FastifyRequest<OverviewRequest>,
  res: FastifyReply
) {
  const {
    startDate,
    endDate,
    timeZone,
    filters,
    pastMinutesStart,
    pastMinutesEnd,
  } = req.query;
  const site = req.params.site;
  const userHasAccessToSite = await getUserHasAccessToSitePublic(req, site);
  if (!userHasAccessToSite) {
    return res.status(403).send({ error: "Forbidden" });
  }

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
