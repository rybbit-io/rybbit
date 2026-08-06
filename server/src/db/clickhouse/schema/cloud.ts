import { execClickhouseInitStep } from "../initUtils.js";

// Hourly per-site event counts, used by cloud usage tracking / billing.
export async function initializeCloudTables() {
  await execClickhouseInitStep(
    "create hourly events by site target table",
    `
      CREATE TABLE IF NOT EXISTS hourly_events_by_site_mv_target (
        event_hour DateTime,          -- The specific hour
        site_id UInt16,
        event_count UInt64            -- The count of events for that site in that hour
      )
      ENGINE = SummingMergeTree()     -- Sums 'event_count' for rows with the same sorting key
      PARTITION BY toYYYYMM(event_hour)
      ORDER BY (event_hour, site_id)
      TTL event_hour + INTERVAL 60 DAY
    `
  );

  await execClickhouseInitStep(
    "create hourly events by site materialized view",
    `
      CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_events_by_site_mv
      TO hourly_events_by_site_mv_target -- Name of the target table
      AS SELECT
        toStartOfHour(timestamp) AS event_hour,
        site_id,
        count() AS event_count
      FROM events
      GROUP BY event_hour, site_id
    `
  );
}
