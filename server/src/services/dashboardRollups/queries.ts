import { TimeBucket } from "@rybbit/shared";
import { resolveTimeWindow, TimeWindowParams } from "../../api/analytics/utils/timeWindow.js";
import { RollupConfig } from "./config.js";
import { planSessionRollups, rollupPredicate } from "./planner.js";

export function buildSessionRollupQuery(
  params: TimeWindowParams,
  config: RollupConfig,
  bucket?: TimeBucket,
  now = Date.now()
): string | null {
  if (bucket && !["day", "week", "month", "year"].includes(bucket)) return null;
  const slices = planSessionRollups(params, config.timeZones, bucket, now);
  if (!slices) return null;
  const window = resolveTimeWindow(params, now);
  return `SELECT ${bucket ? "time," : ""} sessions, pageviews, users,
    if(sessions > 0, pageviews / sessions, 0) AS pages_per_session,
    if(sessions > 0, bounced_sessions * 100.0 / sessions, 0) AS bounce_rate,
    if(sessions > 0, total_session_duration_seconds / sessions, 0) AS session_duration
  FROM (
    SELECT ${bucket ? `${window.bucketed("bucket_start", bucket)} AS time,` : ""}
      sum(sessions) AS sessions, sum(pageviews) AS pageviews,
      uniqCombined64Merge(users) AS users, sum(bounced_sessions) AS bounced_sessions,
      sum(total_session_duration_seconds) AS total_session_duration_seconds
    FROM ${config.table}
    WHERE site_id = {siteId:Int32} AND (${rollupPredicate(slices)})
    ${bucket ? `GROUP BY time ORDER BY time ${window.fill(bucket)}` : ""}
  ) ${bucket ? "ORDER BY time" : ""}`;
}
