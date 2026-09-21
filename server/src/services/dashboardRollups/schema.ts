import SqlString from "sqlstring";
import { RollupConfig } from "./config.js";

export function sessionRollupSelect(config: RollupConfig): string {
  const periods = ["('hour', 'UTC', session_hour)"];
  for (const zone of config.timeZones) {
    const tz = SqlString.escape(zone);
    periods.push(`('day', ${tz}, toTimeZone(toStartOfDay(session_hour, ${tz}), 'UTC'))`);
    periods.push(
      `('month', ${tz}, toTimeZone(toDateTime(toStartOfMonth(toTimeZone(session_hour, ${tz})), ${tz}), 'UTC'))`
    );
  }
  return `SELECT
    site_id, period.1 AS resolution, period.2 AS time_zone, period.3 AS bucket_start,
    sum(hour_sessions) AS sessions, sum(hour_pageviews) AS pageviews,
    uniqCombined64MergeState(hour_users) AS users,
    sum(hour_bounced) AS bounced_sessions, sum(hour_duration) AS total_session_duration_seconds
  FROM (
    SELECT site_id, toTimeZone(toStartOfHour(start_time), 'UTC') AS session_hour,
      count() AS hour_sessions, sum(pageviews) AS hour_pageviews,
      uniqCombined64State(user_id) AS hour_users,
      countIf(pageviews = 1) AS hour_bounced,
      sum(toUInt64(end_time - start_time)) AS hour_duration
    FROM sessions_mv_target FINAL
    GROUP BY site_id, session_hour
  )
  ARRAY JOIN [${periods.join(",\n    ")}] AS period
  GROUP BY site_id, resolution, time_zone, bucket_start`;
}

export function sessionRollupDDL(config: RollupConfig): string[] {
  return [
    `CREATE TABLE IF NOT EXISTS ${config.table} (
      site_id UInt16,
      resolution LowCardinality(String),
      time_zone LowCardinality(String),
      bucket_start DateTime('UTC'),
      sessions UInt64, pageviews UInt64,
      users AggregateFunction(uniqCombined64, String),
      bounced_sessions UInt64, total_session_duration_seconds UInt64
    ) ENGINE = MergeTree
    PARTITION BY toYYYYMM(bucket_start)
    ORDER BY (site_id, resolution, time_zone, bucket_start)
    SETTINGS index_granularity = 64, min_bytes_for_wide_part = 0, min_rows_for_wide_part = 0`,
    // Replacing one target publishes every resolution atomically. No APPEND or
    // overlapping INSERT backfill: reruns cannot duplicate a session.
    `CREATE MATERIALIZED VIEW IF NOT EXISTS ${config.view}
      REFRESH EVERY 1 HOUR TO ${config.table} AS ${sessionRollupSelect(config)}`,
  ];
}

export function sessionRollupValidation(config: RollupConfig): string {
  // Every resolution in a published snapshot must describe the same sessions.
  return `SELECT site_id FROM (
    SELECT site_id, resolution, time_zone,
      sum(sessions) AS s, sum(pageviews) AS p, uniqCombined64Merge(users) AS u,
      sum(bounced_sessions) AS b, sum(total_session_duration_seconds) AS d
    FROM ${config.table} GROUP BY site_id, resolution, time_zone
  ) GROUP BY site_id
  HAVING uniqExact(tuple(s, p, u, b, d)) != 1 OR count() != ${1 + 2 * config.timeZones.length}`;
}
