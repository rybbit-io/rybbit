import { TimeWindowParams } from "../../api/analytics/utils/timeWindow.js";
import { planSessionRollups } from "./planner.js";
import { routeBucket } from "./routes.js";

type ProjectedMetric = { table: string; value: string; hostname?: boolean; nonEmpty?: boolean };

export function projectedMetricGroups(params: TimeWindowParams, metric: ProjectedMetric, now = Date.now()): string {
  const slices = planSessionRollups(params, ["UTC"], undefined, now);
  if (!slices) throw new Error("Invalid projected metric window");
  const reads = slices.map(slice => {
    const column = routeBucket[slice.resolution];
    return `SELECT ${metric.value} AS value, ${metric.hostname ? "any(hostname) AS hostname," : ""}
      sum(pageviews) AS pageviews, uniqMergeState(sessions) AS session_state
      FROM ${metric.table} WHERE site_id = {siteId:Int32}
        ${metric.nonEmpty ? `AND ${metric.value} <> ''` : ""}
        ${slice.start === null ? "" : `AND ${column} >= toDateTime(${slice.start}, 'UTC')`}
        ${slice.end === null ? "" : `AND ${column} < toDateTime(${slice.end}, 'UTC')`}
      GROUP BY value`;
  });
  return reads.length
    ? `SELECT value, ${metric.hostname ? "any(hostname) AS hostname," : ""}
    sum(pageviews) AS pageviews, uniqMerge(session_state) AS count
    FROM (${reads.join(" UNION ALL ")}) GROUP BY value`
    : `SELECT ${metric.value} AS value, ${metric.hostname ? "any(hostname) AS hostname," : ""}
     sum(pageviews) AS pageviews, uniqMerge(sessions) AS count
     FROM ${metric.table} WHERE 0 GROUP BY value`;
}

export function dimensionProjectionDDL(materialize = false): string[] {
  const statements: string[] = [];
  for (const dimension of ["country", "device_type"]) {
    const table = `${dimension}_hourly_mv_target`;
    statements.push(`ALTER TABLE ${table} MODIFY SETTING deduplicate_merge_projection_mode = 'rebuild'`);
    for (const resolution of ["hour", "day", "month"] as const) {
      const name = `dashboard_${dimension}_${resolution}_v2`;
      statements.push(`ALTER TABLE ${table} ADD PROJECTION IF NOT EXISTS ${name} (
        SELECT site_id, ${routeBucket[resolution]} AS dimension_bucket, ${dimension},
          sum(pageviews), uniqMergeState(sessions)
        GROUP BY site_id, dimension_bucket, ${dimension}
      )`);
      if (materialize) statements.push(`ALTER TABLE ${table} MATERIALIZE PROJECTION ${name}`);
    }
  }
  return statements;
}
