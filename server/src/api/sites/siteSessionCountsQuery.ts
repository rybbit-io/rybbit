export function buildSiteSessionCountsQuery(useLiteDashboard: boolean) {
  if (useLiteDashboard) {
    return `
      SELECT
        site_id,
        uniqMerge(sessions) AS total_sessions
      FROM overview_hourly_mv_target
      WHERE event_hour >= now() - INTERVAL 1 DAY
        AND site_id IN {siteIds:Array(UInt16)}
      GROUP BY site_id
    `;
  }

  return `
    SELECT
      site_id,
      uniqExact(session_id) AS total_sessions
    FROM events
    WHERE timestamp >= now() - INTERVAL 1 DAY
      AND site_id IN {siteIds:Array(UInt16)}
    GROUP BY site_id
  `;
}
