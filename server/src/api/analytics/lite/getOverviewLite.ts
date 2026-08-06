import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { getOverview } from "../getOverview.js";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";
import { getLiteSessionFilter, getLiteTimeStatement, hasLiteFilters } from "./utils.js";

type GetOverviewLiteResponse = {
  sessions: number;
  pageviews: number;
  users: number;
  pages_per_session: number;
  bounce_rate: number;
  session_duration: number;
};

interface GetOverviewLiteRequest {
  Params: { siteId: string };
  Querystring: FilterParams;
}

// Filtered queries read sessions_mv_target (one row per session) so any
// session-column filter — country, device_type, etc. — stays on the MVs.
// Pass `filterSql: null` for the unfiltered single-read of the refreshable
// session_hourly_mv_target.
export const buildOverviewLiteQuery = (query: GetOverviewLiteRequest["Querystring"], filterSql: string | null) => {
  if (filterSql !== null) {
    const sessionsTime = getLiteTimeStatement(query, "start_time");
    return `
      SELECT
        sessions,
        pageviews,
        users,
        if(sessions > 0, pageviews / sessions, 0) AS pages_per_session,
        if(sessions > 0, bounced_sessions * 100.0 / sessions, 0) AS bounce_rate,
        if(sessions > 0, total_session_duration_seconds / sessions, 0) AS session_duration
      FROM (
        SELECT
          count() AS sessions,
          sum(session_pageviews) AS pageviews,
          uniqExact(user_id) AS users,
          countIf(session_pageviews = 1) AS bounced_sessions,
          sum(toUInt64(session_end - session_start)) AS total_session_duration_seconds
        FROM (
          SELECT
            session_id,
            any(user_id) AS user_id,
            sum(pageviews) AS session_pageviews,
            min(start_time) AS session_start,
            max(end_time) AS session_end
          FROM sessions_mv_target
          WHERE site_id = {siteId:Int32}
            ${sessionsTime}
            ${filterSql}
          GROUP BY session_id
        )
      )
    `;
  }

  const timeStatement = getLiteTimeStatement(query, "session_hour");

  // Single read of the refreshable session_hourly_mv_target — ~720 rows/month
  // per site instead of millions of session rows. All 6 metrics derive from
  // pre-computed sums and one HLL state.
  //
  // Aggregations run in the inner subquery; divisions compose plain values in
  // the outer SELECT. Don't alias `sum(sessions) AS sessions` at this level —
  // ClickHouse will resolve the column name to the aggregate and reject as
  // nested aggregation.
  return `
      SELECT
        sessions,
        pageviews,
        users,
        if(sessions > 0, pageviews / sessions, 0) AS pages_per_session,
        if(sessions > 0, bounced_sessions * 100.0 / sessions, 0) AS bounce_rate,
        if(sessions > 0, total_session_duration_seconds / sessions, 0) AS session_duration
      FROM (
        SELECT
          sum(sessions) AS sessions,
          sum(pageviews) AS pageviews,
          uniqMerge(users) AS users,
          sum(bounced_sessions) AS bounced_sessions,
          sum(total_session_duration_seconds) AS total_session_duration_seconds
        FROM session_hourly_mv_target
        WHERE site_id = {siteId:Int32}
          ${timeStatement}
      )
    `;
};

export const getOverviewLite = analyticsRoute<GetOverviewLiteRequest>(
  "overview",
  async (req: FastifyRequest<GetOverviewLiteRequest>, res: FastifyReply) => {
    const site = Number(req.params.siteId);
    const filtersPresent = hasLiteFilters(req.query.filters);

    // Filters that touch columns the session rollup doesn't carry (pathname,
    // utm, …) fall back to the raw-events query.
    let query: string;
    if (filtersPresent) {
      const filter = getLiteSessionFilter(req.query.filters);
      if (!filter.supported) {
        return getOverview(req, res);
      }
      query = buildOverviewLiteQuery(req.query, filter.sql);
    } else {
      query = buildOverviewLiteQuery(req.query, null);
    }

    const data = await runAnalyticsQuery<GetOverviewLiteResponse>({
      query,
      params: { siteId: site },
    });

    return res.send({ data: data[0] });
  }
);
