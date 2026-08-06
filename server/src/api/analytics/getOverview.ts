import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { getFilterStatement } from "./utils/getFilterStatement.js";
import { getTimeStatement } from "./utils/utils.js";
import { analyticsRoute, runAnalyticsQuery } from "./utils/analyticsQuery.js";
import { EFFECTIVE_SESSION_USER_ID } from "./utils/effectiveUserId.js";

type GetOverviewResponse = {
  sessions: number;
  pageviews: number;
  users: number;
  pages_per_session: number;
  bounce_rate: number;
  session_duration: number;
};

export const buildOverviewQuery = (params: FilterParams, siteId: number) => {
  const timeStatement = getTimeStatement(params);
  const filterStatement = getFilterStatement(params.filters, siteId, timeStatement);

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
            -- Aliased away from \`user_id\` on purpose: an alias that shadows a column
            -- referenced inside its own expression is a cyclic-alias error in ClickHouse.
            ${EFFECTIVE_SESSION_USER_ID} AS effective_user_id,
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
        COUNT(DISTINCT f.effective_user_id) AS users
    FROM FilteredSessionsWithStats f
    LEFT JOIN AllSessionPageviews asp ON f.session_id = asp.session_id`;
};

export interface OverviewRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams;
}

export const getOverview = analyticsRoute<OverviewRequest>(
  "overview",
  async (req: FastifyRequest<OverviewRequest>, res: FastifyReply) => {
    const siteId = Number(req.params.siteId);

    const data = await runAnalyticsQuery<GetOverviewResponse>({
      query: buildOverviewQuery(req.query, siteId),
      params: { siteId },
    });

    return res.send({ data: data[0] });
  }
);
