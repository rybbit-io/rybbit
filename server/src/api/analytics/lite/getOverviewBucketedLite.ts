import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import SqlString from "sqlstring";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { getOverviewBucketed } from "../getOverviewBucketed.js";
import { TimeBucket } from "../types.js";
import { TimeBucketToFn, processResults } from "../utils/utils.js";
import { getLiteFillClause, getLiteSessionFilter, getLiteTimeStatement, hasLiteFilters, liteBucket } from "./utils.js";

type GetOverviewBucketedLiteResponse = {
  time: string;
  pageviews: number;
  sessions: number;
  pages_per_session: number;
  bounce_rate: number;
  session_duration: number;
  users: number;
}[];

// Hour-bucketed charts use the streaming MV JOIN: pageviews/users are bucketed
// by EVENT timestamp (when the pageview happened) which matches the standard
// endpoint's semantics.
//
// Day/week/month charts read the refreshable session_hourly_mv directly. At
// day+ granularity the difference between event-time and session-start-time
// bucketing is negligible (sessions rarely cross day boundaries), and we get
// all 6 metrics from a single small table.
function buildHourBucketQuery(args: {
  fn: string;
  tz: string;
  overviewTime: string;
  sessionsTime: string;
  fill: string;
}) {
  const { fn, tz, overviewTime, sessionsTime, fill } = args;
  return `
    SELECT
      coalesce(p.time, s.time) AS time,
      coalesce(p.pageviews, 0) AS pageviews,
      coalesce(p.users, 0) AS users,
      coalesce(s.sessions, 0) AS sessions,
      coalesce(s.pages_per_session, 0) AS pages_per_session,
      coalesce(s.bounce_rate, 0) AS bounce_rate,
      coalesce(s.session_duration, 0) AS session_duration
    FROM (
      SELECT
        toDateTime(${fn}(toTimeZone(event_hour, ${tz}))) AS time,
        sum(pageviews) AS pageviews,
        uniqMerge(users) AS users
      FROM overview_hourly_mv_target
      WHERE site_id = {siteId:Int32}
        ${overviewTime}
      GROUP BY time
      ORDER BY time ${fill}
    ) p
    FULL JOIN (
      SELECT
        toDateTime(${fn}(toTimeZone(session_start, ${tz}))) AS time,
        count() AS sessions,
        avg(session_pageviews) AS pages_per_session,
        countIf(session_pageviews = 1) / count() * 100 AS bounce_rate,
        avg(session_end - session_start) AS session_duration
      FROM (
        SELECT
          session_id,
          sum(pageviews) AS session_pageviews,
          min(start_time) AS session_start,
          max(end_time) AS session_end
        FROM sessions_mv_target
        WHERE site_id = {siteId:Int32}
          ${sessionsTime}
        GROUP BY session_id
      )
      GROUP BY time
      ORDER BY time ${fill}
    ) s USING time
    ORDER BY time
  `;
}

function buildDayBucketQuery(args: {
  fn: string;
  tz: string;
  sessionTime: string;
  fill: string;
}) {
  const { fn, tz, sessionTime, fill } = args;
  // Aggregate in the inner GROUP BY, then compose ratios in the outer SELECT.
  // Aliasing `sum(sessions) AS sessions` would shadow the column inside the
  // div-by-zero guard and trigger ILLEGAL_AGGREGATION.
  return `
    SELECT
      time,
      sessions,
      pageviews,
      users,
      if(sessions > 0, pageviews / sessions, 0) AS pages_per_session,
      if(sessions > 0, bounced_sessions * 100.0 / sessions, 0) AS bounce_rate,
      if(sessions > 0, total_session_duration_seconds / sessions, 0) AS session_duration
    FROM (
      SELECT
        toDateTime(${fn}(toTimeZone(session_hour, ${tz}))) AS time,
        sum(sessions) AS sessions,
        sum(pageviews) AS pageviews,
        uniqMerge(users) AS users,
        sum(bounced_sessions) AS bounced_sessions,
        sum(total_session_duration_seconds) AS total_session_duration_seconds
      FROM session_hourly_mv_target
      WHERE site_id = {siteId:Int32}
        ${sessionTime}
      GROUP BY time
      ORDER BY time ${fill}
    )
    ORDER BY time
  `;
}

// Filtered charts read sessions_mv_target (one row per session) and bucket by
// session start. pageviews/users come from the same rollup rather than the
// dimensionless overview_hourly_mv, so any session-column filter stays on the
// MVs. Bucketing by session-start instead of event-time is the same negligible
// approximation the day-bucket path already makes.
function buildSessionMvFilteredQuery(args: {
  fn: string;
  tz: string;
  sessionsTime: string;
  fill: string;
  filterSql: string;
}) {
  const { fn, tz, sessionsTime, fill, filterSql } = args;
  return `
    SELECT
      time,
      sessions,
      pageviews,
      users,
      if(sessions > 0, pageviews / sessions, 0) AS pages_per_session,
      if(sessions > 0, bounced_sessions * 100.0 / sessions, 0) AS bounce_rate,
      if(sessions > 0, total_session_duration_seconds / sessions, 0) AS session_duration
    FROM (
      SELECT
        toDateTime(${fn}(toTimeZone(session_start, ${tz}))) AS time,
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
      GROUP BY time
      ORDER BY time ${fill}
    )
    ORDER BY time
  `;
}

export async function getOverviewBucketedLite(
  req: FastifyRequest<{
    Params: { siteId: string };
    Querystring: FilterParams<{ bucket: TimeBucket }>;
  }>,
  res: FastifyReply
) {
  const site = Number(req.params.siteId);
  const bucket = liteBucket(req.query.bucket);
  const fn = TimeBucketToFn[bucket];
  const tz = SqlString.escape(req.query.time_zone || "UTC");

  const isAllTime =
    !req.query.start_date &&
    !req.query.end_date &&
    req.query.past_minutes_start === undefined &&
    req.query.past_minutes_end === undefined;
  const fill = isAllTime ? "" : getLiteFillClause(req.query, bucket);

  const filtersPresent = hasLiteFilters(req.query.filters);

  let query: string;
  if (filtersPresent) {
    // Session-column filters stay on sessions_mv_target; anything else falls
    // back to the raw-events query.
    const filter = getLiteSessionFilter(req.query.filters);
    if (!filter.supported) {
      return getOverviewBucketed(req, res);
    }
    query = buildSessionMvFilteredQuery({
      fn,
      tz,
      sessionsTime: getLiteTimeStatement(req.query, "start_time"),
      fill,
      filterSql: filter.sql,
    });
  } else {
    const useDayBucket = bucket === "day" || bucket === "week" || bucket === "month" || bucket === "year";

    query = useDayBucket
      ? buildDayBucketQuery({
          fn,
          tz,
          sessionTime: getLiteTimeStatement(req.query, "session_hour"),
          fill,
        })
      : buildHourBucketQuery({
          fn,
          tz,
          overviewTime: getLiteTimeStatement(req.query, "event_hour"),
          sessionsTime: getLiteTimeStatement(req.query, "start_time"),
          fill,
        });
  }

  try {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: { siteId: site },
    });
    const data = await processResults<GetOverviewBucketedLiteResponse[number]>(result);
    return res.send({ data });
  } catch (error) {
    console.error("Error fetching lite bucketed overview:", error);
    return res.status(500).send({ error: "Failed to fetch overview" });
  }
}
