import { TimeBucket } from "@rybbit/shared";
import { QuerySpec } from "./utils/analyticsQuery.js";
import { EFFECTIVE_SESSION_USER_ID } from "./utils/effectiveUserId.js";
import { resolveTimeWindow, TimeWindowParams } from "./utils/timeWindow.js";

export interface SiteCardQueryParams {
  siteIds: number[];
  current: TimeWindowParams;
  comparison: TimeWindowParams | null;
  bucket: TimeBucket;
}

export interface SiteCardQueries {
  totals: QuerySpec;
  series: QuerySpec;
  fillMissingBuckets: boolean;
}

export function buildSiteCardsQueries(
  { siteIds, current, comparison, bucket }: SiteCardQueryParams,
  now = Date.now()
): SiteCardQueries {
  const window = resolveTimeWindow(current, now);
  const previous = comparison === null ? null : resolveTimeWindow(comparison, now);
  const currentPredicate = `(1 ${window.where()})`;
  const previousPredicate = previous ? `(1 ${previous.where()})` : "0";
  // An event in overlapping windows belongs to both periods. Resolve identity
  // AFTER this split, using the same session-level definition as getOverview.
  // Otherwise identify() in the current period could rewrite previous users.
  const periods = previous ? `if(${currentPredicate}, if(${previousPredicate}, [0, 1], [0]), [1])` : "[0]";
  const params = { siteIds };

  const totals: QuerySpec = {
    query: `
      SELECT site_id,
        countIf(period = 0) AS current_sessions,
        COUNT(DISTINCT if(period = 0, effective_user_id, NULL)) AS current_users,
        countIf(period = 1) AS previous_sessions,
        COUNT(DISTINCT if(period = 1, effective_user_id, NULL)) AS previous_users
      FROM (
        SELECT site_id, session_id, period,
          ${EFFECTIVE_SESSION_USER_ID} AS effective_user_id
        FROM events
        ARRAY JOIN ${periods} AS period
        WHERE site_id IN {siteIds:Array(Int32)}
          AND (${currentPredicate} OR ${previousPredicate})
        GROUP BY site_id, session_id, period
      )
      GROUP BY site_id
    `,
    params,
  };

  // Bounded charts get empty buckets from WITH FILL. For all-time, retain the
  // old chart's event-only buckets (zero new sessions) without a second events
  // scan: collect each session's distinct active buckets alongside its start.
  const sessionBucket = window.bucketed("session_start", bucket);
  const counts = `
    SELECT site_id,
      ${window.isAllTime ? "active_bucket" : sessionBucket} AS time,
      ${window.isAllTime ? `countIf(active_bucket = ${sessionBucket})` : "count()"} AS sessions
    FROM (
      SELECT site_id, session_id, min(timestamp) AS session_start
        ${window.isAllTime ? `, groupUniqArray(${window.bucketed("timestamp", bucket)}) AS active_buckets` : ""}
      FROM events
      WHERE site_id IN {siteIds:Array(Int32)} ${window.where()}
      GROUP BY site_id, session_id
    )
    ${window.isAllTime ? "ARRAY JOIN active_buckets AS active_bucket" : ""}
    GROUP BY site_id, time
  `;

  return {
    totals,
    fillMissingBuckets: !window.isAllTime,
    series: {
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
