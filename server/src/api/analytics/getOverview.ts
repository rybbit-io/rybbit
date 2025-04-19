import { FastifyReply, FastifyRequest } from "fastify";
import clickhouse from "../../db/clickhouse/clickhouse.js";
import {
  getFilterStatement,
  getTimeStatement,
  processResults,
} from "./utils.js";
import { getUserHasAccessToSitePublic } from "../../lib/auth-utils.js";

interface GetOverviewRequest {
  Params: {
    site: string;
  };
  Querystring: {
    startDate: string;
    endDate: string;
    timezone: string;
    filters: string;
    pastMinutes?: number;
  };
}

type GetOverviewResponse = {
  sessions: number;
  pageviews: number;
  users: number;
  pages_per_session: number;
  bounce_rate: number;
  session_duration: number;
};

const getQuery = ({
  startDate,
  endDate,
  timezone,
  site,
  filters,
  pastMinutes,
}: GetOverviewRequest["Params"] & GetOverviewRequest["Querystring"]) => {
  const filterStatement = getFilterStatement(filters);

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
                    site_id = ${site}
                    ${filterStatement}
                    ${getTimeStatement(
                      pastMinutes
                        ? { pastMinutes }
                        : {
                            date: { startDate, endDate, timezone },
                          }
                    )}
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
                site_id = ${site}
                ${filterStatement}
                ${getTimeStatement(
                  pastMinutes
                    ? { pastMinutes }
                    : {
                        date: { startDate, endDate, timezone },
                      }
                )}
                AND type = 'pageview'
        ) AS page_stats`;
};

export async function fetchOverview({
  startDate,
  endDate,
  timezone,
  site,
  filters,
  pastMinutes,
}: GetOverviewRequest["Params"] & GetOverviewRequest["Querystring"]) {
  const query = getQuery({
    startDate,
    endDate,
    timezone,
    site,
    filters,
    pastMinutes: Number(pastMinutes),
  });

  try {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
    });

    const data = await processResults<GetOverviewResponse>(result);
    return data[0] || null;
  } catch (error) {
    console.error("Error fetching overview:", error);
    return null;
  }
}

export async function getOverview(
  req: FastifyRequest<GetOverviewRequest>,
  res: FastifyReply
) {
  const { startDate, endDate, timezone, filters, pastMinutes } = req.query;
  const site = req.params.site;

  const userHasAccessToSite = await getUserHasAccessToSitePublic(req, site);
  if (!userHasAccessToSite) {
    return res.status(403).send({ error: "Forbidden" });
  }

  const data = await fetchOverview({
    startDate,
    endDate,
    timezone,
    site,
    filters,
    pastMinutes,
  });
  if (!data) {
    return res.status(500).send({ error: "Failed to fetch overview" });
  }

  return res.send({ data });
}
