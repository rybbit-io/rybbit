import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import SqlString from "sqlstring";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { TimeBucket } from "../types.js";
import { TimeBucketToFn, processResults } from "../utils/utils.js";
import { getLiteFillClause, getLiteTimeStatement, liteBucket } from "./utils.js";

type GetOverviewBucketedLiteResponse = {
  time: string;
  pageviews: number;
  sessions: number;
  pages_per_session: number;
  bounce_rate: number;
  session_duration: number;
  users: number;
}[];

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

  const overviewTime = getLiteTimeStatement(req.query, "event_hour");
  const sessionsTime = getLiteTimeStatement(req.query, "start_time");
  const isAllTime =
    !req.query.start_date &&
    !req.query.end_date &&
    req.query.past_minutes_start === undefined &&
    req.query.past_minutes_end === undefined;
  const fill = isAllTime ? "" : getLiteFillClause(req.query, bucket);

  // Pageviews + users are timestamp-bucketed (overview_hourly_mv groups by
  // toStartOfHour(timestamp)). Session-derived metrics are start_time-bucketed
  // (sessions_mv). Joined on the bucket time, matching getOverviewBucketed.
  const query = `
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
        toDateTime(${fn}(toTimeZone(start_time, ${tz}))) AS time,
        count() AS sessions,
        avg(pageviews) AS pages_per_session,
        countIf(pageviews = 1) / count() * 100 AS bounce_rate,
        avg(end_time - start_time) AS session_duration
      FROM (
        SELECT
          session_id,
          sum(pageviews) AS pageviews,
          min(start_time) AS start_time,
          max(end_time) AS end_time
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
