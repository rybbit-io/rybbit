import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import SqlString from "sqlstring";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";
import { buildUserEventScope } from "./userEventScope.js";

export interface GetUserSummaryRequest {
  Params: {
    siteId: string;
    userId: string;
  };
  Querystring: FilterParams;
}

export interface UserSummary {
  sessions: number;
  pageviews: number;
  events: number;
  /** Average session length in seconds. */
  duration: number;
  /** Days, in the request's timezone, on which the user started a session. */
  active_days: number;
}

/**
 * The profile's stat band for one window. The page asks for it twice, once for
 * the selected period and once for the comparison period, so both sides of a
 * delta come from the same query. Unlike the profile summary it never 404s:
 * a window with no sessions is a row of zeros, which is what a delta needs.
 */
export const buildUserSummaryQuery = (query: GetUserSummaryRequest["Querystring"], siteId: number) => {
  const { filteredSessionsCTE, scopedEvents } = buildUserEventScope(query, siteId);
  const timeZone = query.time_zone || "UTC";

  return `
    WITH ${filteredSessionsCTE ? `${filteredSessionsCTE},` : ""}
    sessions AS (
        SELECT
            session_id,
            MIN(timestamp) AS session_start,
            dateDiff('second', MIN(timestamp), MAX(timestamp)) AS session_duration,
            countIf(type = 'pageview') AS pageviews,
            countIf(type = 'custom_event') AS events
        FROM ${scopedEvents}
        GROUP BY
            session_id
    )
    SELECT
        count() AS sessions,
        if(count() = 0, 0, round(avg(session_duration))) AS duration,
        sum(pageviews) AS pageviews,
        sum(events) AS events,
        uniqExact(toDate(session_start, ${SqlString.escape(timeZone)})) AS active_days
    FROM
        sessions
  `;
};

const EMPTY_SUMMARY: UserSummary = { sessions: 0, pageviews: 0, events: 0, duration: 0, active_days: 0 };

export const getUserSummary = analyticsRoute<GetUserSummaryRequest>(
  "user summary",
  async (req: FastifyRequest<GetUserSummaryRequest>, res: FastifyReply) => {
    const { siteId, userId } = req.params;

    const rows = await runAnalyticsQuery<UserSummary>({
      query: buildUserSummaryQuery(req.query, Number(siteId)),
      params: { userId, site: Number(siteId) },
    });

    return res.send({ data: rows[0] ?? EMPTY_SUMMARY });
  }
);
