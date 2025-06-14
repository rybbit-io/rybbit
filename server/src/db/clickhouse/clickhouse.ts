import { createClient } from "@clickhouse/client";
import { IS_CLOUD } from "../../lib/const.js";

export const clickhouse = createClient({
  url: process.env.CLICKHOUSE_HOST,
  database: process.env.CLICKHOUSE_DB,
  username: process.env.CLICKHOUSE_USER,
  password: process.env.CLICKHOUSE_PASSWORD,
});

export const initializeClickhouse = async () => {
  // Create events table
  await clickhouse.exec({
    query: `
      CREATE TABLE IF NOT EXISTS events (
        site_id UInt16,
        timestamp DateTime,
        session_id String,
        user_id String,
        hostname String,
        pathname String,
        querystring String, /* URL parameters stored in raw format */
        url_parameters Map(String, String), /* Structured storage for all URL parameters */
        page_title String,
        referrer String,
        channel String,
        browser LowCardinality(String),
        browser_version LowCardinality(String),
        operating_system LowCardinality(String),
        operating_system_version LowCardinality(String),
        language LowCardinality(String),
        country LowCardinality(FixedString(2)),
        region LowCardinality(String),
        city String,
        lat Float64,
        lon Float64,
        screen_width UInt16,
        screen_height UInt16,
        device_type LowCardinality(String),
        type LowCardinality(String) DEFAULT 'pageview',
        event_name String,
        props JSON
      )
      ENGINE = MergeTree()
      PARTITION BY toYYYYMM(timestamp)
      ORDER BY (site_id, timestamp)
      `,
  });

  // Add performance metric columns if they don't exist
  await clickhouse.exec({
    query: `
      ALTER TABLE events
        ADD COLUMN IF NOT EXISTS lcp Nullable(Float64),
        ADD COLUMN IF NOT EXISTS cls Nullable(Float64),
        ADD COLUMN IF NOT EXISTS inp Nullable(Float64),
        ADD COLUMN IF NOT EXISTS fcp Nullable(Float64),
        ADD COLUMN IF NOT EXISTS ttfb Nullable(Float64)
    `,
  });

  if (IS_CLOUD) {
    await clickhouse.exec({
      query: `
        CREATE TABLE IF NOT EXISTS hourly_events_by_site_mv_target (
          event_hour DateTime,          -- The specific hour
          site_id UInt16,
          event_count UInt64            -- The count of events for that site in that hour
        )
        ENGINE = SummingMergeTree()     -- Sums 'event_count' for rows with the same sorting key
        PARTITION BY toYYYYMM(event_hour)
        ORDER BY (event_hour, site_id)
        TTL event_hour + INTERVAL 60 DAY
      `,
    });

    // 2. Create the Materialized View
    // This MV will populate the 'hourly_events_by_site_mv_target' table.
    await clickhouse.exec({
      query: `
        CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_events_by_site_mv
        TO hourly_events_by_site_mv_target -- Name of the target table
        AS SELECT
          toStartOfHour(timestamp) AS event_hour,
          site_id,
          count() AS event_count
        FROM events
        GROUP BY event_hour, site_id
      `,
    });
  }
};
