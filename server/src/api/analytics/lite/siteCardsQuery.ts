import {
  buildSiteCardsQueries as buildRawSiteCardsQueries,
  SiteCardQueries,
  SiteCardQueryParams,
} from "../siteCardsQuery.js";
import { resolveTimeWindow } from "../utils/timeWindow.js";
import { hasLiteRealtimeRange, liteBucket } from "./utils.js";

export function buildSiteCardsQueries(
  { siteIds, current, comparison, bucket: requestedBucket }: SiteCardQueryParams,
  now = Date.now()
): SiteCardQueries {
  if (hasLiteRealtimeRange(current) || (comparison && hasLiteRealtimeRange(comparison))) {
    return buildRawSiteCardsQueries({ siteIds, current, comparison, bucket: requestedBucket }, now);
  }

  // Resolve both periods against one clock, including adjacent rolling windows.
  const window = resolveTimeWindow(current, now);
  const previous = comparison === null ? null : resolveTimeWindow(comparison, now);
  const currentPredicate = `(1 ${window.where("session_hour")})`;
  const previousPredicate = previous ? `(1 ${previous.where("session_hour")})` : "0";
  const bucket = liteBucket(requestedBucket);
  const params = { siteIds };

  const totals = {
    query: `
      SELECT site_id,
        sumIf(sessions, ${currentPredicate}) AS current_sessions,
        uniqMergeIf(users, ${currentPredicate}) AS current_users,
        sumIf(sessions, ${previousPredicate}) AS previous_sessions,
        uniqMergeIf(users, ${previousPredicate}) AS previous_users
      FROM session_hourly_mv_target
      WHERE site_id IN {siteIds:Array(Int32)}
        AND (${currentPredicate} OR ${previousPredicate})
      GROUP BY site_id
    `,
    params,
  };

  // Match the existing lite chart: live sessions for hours, refreshable rollup
  // for day+ buckets. The cards only display sessions, so no events JOIN or
  // user-state merge is needed for their sparklines.
  const counts =
    bucket === "hour"
      ? `
    SELECT site_id, ${window.bucketed("session_start", bucket)} AS time, count() AS sessions
    FROM (
      SELECT site_id, session_id, min(start_time) AS session_start
      FROM sessions_mv_target
      WHERE site_id IN {siteIds:Array(Int32)} ${window.where("start_time")}
      GROUP BY site_id, session_id
    )
    GROUP BY site_id, time
  `
      : `
    SELECT site_id, ${window.bucketed("session_hour", bucket)} AS time, sum(sessions) AS sessions
    FROM session_hourly_mv_target
    WHERE site_id IN {siteIds:Array(Int32)} ${window.where("session_hour")}
    GROUP BY site_id, time
  `;

  return {
    totals,
    fillMissingBuckets: !window.isAllTime,
    series: {
      // Fill the shared time axis once. Empty buckets have an empty array;
      // the handler supplies zero for every missing site, including sites with
      // no rows anywhere in the selected window.
      query: `
        SELECT time, groupArray((site_id, sessions)) AS site_sessions
        FROM (${counts})
        GROUP BY time
        ORDER BY time ${window.fill(bucket)}
      `,
      params,
    },
  };
}
