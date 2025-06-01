import { createClient } from "@clickhouse/client";
import { IS_CLOUD } from "../../lib/const.js";

export const clickhouse = createClient({
  url: process.env.CLICKHOUSE_HOST,
  database: process.env.CLICKHOUSE_DB,
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

  // Create session replay tables
  await clickhouse.exec({
    query: `
      CREATE TABLE IF NOT EXISTS session_replay_events (
        site_id UInt16,
        session_id String,
        user_id String,
        timestamp DateTime,
        event_type LowCardinality(String),
        event_data String,
        sequence_number UInt32,
        is_complete UInt8 DEFAULT 0
      )
      ENGINE = MergeTree()
      PARTITION BY toYYYYMM(timestamp)
      ORDER BY (site_id, session_id, sequence_number)
      `,
  });

  await clickhouse.exec({
    query: `
      CREATE TABLE IF NOT EXISTS session_replay_metadata (
        site_id UInt16,
        session_id String,
        user_id String,
        start_time DateTime,
        end_time Nullable(DateTime),
        duration_ms Nullable(UInt32),
        event_count UInt32,
        compressed_size_bytes UInt32,
        page_url String,
        user_agent String,
        country LowCardinality(FixedString(2)),
        region LowCardinality(String),
        city String,
        lat Float64,
        lon Float64,
        browser LowCardinality(String),
        browser_version LowCardinality(String),
        operating_system LowCardinality(String),
        operating_system_version LowCardinality(String),
        language LowCardinality(String),
        screen_width UInt16,
        screen_height UInt16,
        device_type LowCardinality(String),
        channel String,
        hostname String,
        referrer String,
        created_at DateTime DEFAULT now()
      )
      ENGINE = ReplacingMergeTree(created_at)
      PARTITION BY toYYYYMM(start_time)
      ORDER BY (site_id, session_id)
      `,
  });
};

export default clickhouse;
