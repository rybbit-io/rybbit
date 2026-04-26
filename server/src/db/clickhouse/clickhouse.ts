import { createClient } from "@clickhouse/client";
import { IS_CLOUD, LITE_DASHBOARD } from "../../lib/const.js";

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

  // Add columns to the events table
  await clickhouse.exec({
    query: `
      ALTER TABLE events
        ADD COLUMN IF NOT EXISTS lcp Nullable(Float64),
        ADD COLUMN IF NOT EXISTS cls Nullable(Float64),
        ADD COLUMN IF NOT EXISTS inp Nullable(Float64),
        ADD COLUMN IF NOT EXISTS fcp Nullable(Float64),
        ADD COLUMN IF NOT EXISTS ttfb Nullable(Float64),
        ADD COLUMN IF NOT EXISTS ip Nullable(String),
        ADD COLUMN IF NOT EXISTS timezone LowCardinality(String) DEFAULT '',
        ADD COLUMN IF NOT EXISTS identified_user_id String DEFAULT '',
        ADD COLUMN IF NOT EXISTS import_id Nullable(UUID),
        ADD COLUMN IF NOT EXISTS tag LowCardinality(String) DEFAULT ''
    `,
  });

  // Create session replay tables
  await clickhouse.exec({
    query: `
      CREATE TABLE IF NOT EXISTS session_replay_events (
        site_id UInt16,
        session_id String,
        user_id String,
        timestamp DateTime64(3),
        event_type LowCardinality(String),
        event_data String,
        event_data_key Nullable(String), -- R2 storage key for cloud deployments
        batch_index Nullable(UInt16), -- Index within the R2 batch
        sequence_number UInt32,
        event_size_bytes UInt32,
        viewport_width Nullable(UInt16),
        viewport_height Nullable(UInt16),
        is_complete UInt8 DEFAULT 0
      )
      ENGINE = MergeTree()
      PARTITION BY toYYYYMM(timestamp)
      ORDER BY (site_id, session_id, sequence_number)
      TTL toDateTime(timestamp) + INTERVAL 30 DAY
      `,
  });

  await clickhouse.exec({
    query: `
      ALTER TABLE session_replay_events
        ADD COLUMN IF NOT EXISTS event_data_key Nullable(String), -- R2 storage key for cloud deployments
        ADD COLUMN IF NOT EXISTS batch_index Nullable(UInt16), -- Index within the R2 batch
        ADD COLUMN IF NOT EXISTS identified_user_id String DEFAULT ''
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
        has_replay_data UInt8 DEFAULT 1,
        created_at DateTime DEFAULT now()
      )
      ENGINE = ReplacingMergeTree(created_at)
      PARTITION BY toYYYYMM(start_time)
      ORDER BY (site_id, session_id)
      TTL start_time + INTERVAL 30 DAY
      `,
  });

  await clickhouse.exec({
    query: `
      ALTER TABLE session_replay_metadata
        ADD COLUMN IF NOT EXISTS identified_user_id String DEFAULT ''
      `,
  });

  // Create uptime monitor events table
  await clickhouse.exec({
    query: `
      CREATE TABLE IF NOT EXISTS monitor_events (
        monitor_id UInt32,
        organization_id String,
        timestamp DateTime,
        
        -- Monitor metadata
        monitor_type LowCardinality(String), -- 'http', 'tcp'
        monitor_url String,
        monitor_name String,
        region LowCardinality(String) DEFAULT 'local',
        
        -- Response data
        status LowCardinality(String), -- 'success', 'failure', 'timeout'
        status_code Nullable(UInt16), -- HTTP status code
        response_time_ms UInt32,
        
        -- HTTP timing breakdown (all in milliseconds)
        dns_time_ms Nullable(UInt32),
        tcp_time_ms Nullable(UInt32),
        tls_time_ms Nullable(UInt32),
        ttfb_ms Nullable(UInt32), -- Time to first byte
        transfer_time_ms Nullable(UInt32),
        
        -- Validation results
        validation_errors Array(String), -- Array of failed validation rules
        
        -- Response metadata (for HTTP)
        response_headers Map(String, String),
        response_size_bytes Nullable(UInt32),
        
        -- TCP specific
        port Nullable(UInt16),
        
        -- Error information
        error_message Nullable(String),
        error_type Nullable(String) -- 'dns_failure', 'connection_timeout', 'ssl_error', etc.
      )
      ENGINE = MergeTree()
      PARTITION BY toYYYYMM(timestamp)
      ORDER BY (organization_id, monitor_id, timestamp)
      SETTINGS ttl_only_drop_parts = 1
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

  if (LITE_DASHBOARD) {
    await initializeLiteDashboardMVs();
  }
};

// Materialized views that back the simplified high-traffic dashboard.
// All views are hourly-bucketed and feed the lite endpoints; raw `events`
// is still queried for filters that aren't keyed in these MVs.
async function initializeLiteDashboardMVs() {
  // Per-session rollup. Replaces the AllSessionPageviews / FilteredSessions
  // CTEs that getOverview and getOverviewBucketed run over raw events.
  // ReplacingMergeTree keyed by session_id collapses the streaming inserts
  // into one final row per session as parts merge.
  await clickhouse.exec({
    query: `
      CREATE TABLE IF NOT EXISTS sessions_mv_target (
        site_id UInt16,
        session_id String,
        user_id String,
        start_time SimpleAggregateFunction(min, DateTime),
        end_time SimpleAggregateFunction(max, DateTime),
        pageviews SimpleAggregateFunction(sum, UInt32),
        events SimpleAggregateFunction(sum, UInt32),
        country LowCardinality(FixedString(2)),
        region LowCardinality(String),
        device_type LowCardinality(String),
        browser LowCardinality(String),
        operating_system LowCardinality(String),
        channel String,
        referrer String,
        hostname String,
        entry_pathname String,
        last_seen SimpleAggregateFunction(max, DateTime)
      )
      ENGINE = AggregatingMergeTree()
      PARTITION BY toYYYYMM(start_time)
      ORDER BY (site_id, session_id)
    `,
  });

  await clickhouse.exec({
    query: `
      CREATE MATERIALIZED VIEW IF NOT EXISTS sessions_mv
      TO sessions_mv_target
      AS SELECT
        site_id,
        session_id,
        any(user_id) AS user_id,
        min(timestamp) AS start_time,
        max(timestamp) AS end_time,
        countIf(type = 'pageview') AS pageviews,
        count() AS events,
        any(country) AS country,
        any(region) AS region,
        any(device_type) AS device_type,
        any(browser) AS browser,
        any(operating_system) AS operating_system,
        any(channel) AS channel,
        any(referrer) AS referrer,
        any(hostname) AS hostname,
        argMin(pathname, timestamp) AS entry_pathname,
        max(timestamp) AS last_seen
      FROM events
      GROUP BY site_id, session_id
    `,
  });

  // Hourly overview rollup. Drives the bucketed chart and overview cards.
  await clickhouse.exec({
    query: `
      CREATE TABLE IF NOT EXISTS overview_hourly_mv_target (
        site_id UInt16,
        event_hour DateTime,
        pageviews SimpleAggregateFunction(sum, UInt64),
        events SimpleAggregateFunction(sum, UInt64),
        users AggregateFunction(uniq, String),
        sessions AggregateFunction(uniq, String)
      )
      ENGINE = AggregatingMergeTree()
      PARTITION BY toYYYYMM(event_hour)
      ORDER BY (site_id, event_hour)
    `,
  });

  await clickhouse.exec({
    query: `
      CREATE MATERIALIZED VIEW IF NOT EXISTS overview_hourly_mv
      TO overview_hourly_mv_target
      AS SELECT
        site_id,
        toStartOfHour(timestamp) AS event_hour,
        countIf(type = 'pageview') AS pageviews,
        count() AS events,
        uniqState(user_id) AS users,
        uniqState(session_id) AS sessions
      FROM events
      GROUP BY site_id, event_hour
    `,
  });

  // Top-pathname rollup. Cardinality is bounded by hour, so high-URL sites
  // still get smaller-than-raw storage. Filtered queries fall back to events.
  await clickhouse.exec({
    query: `
      CREATE TABLE IF NOT EXISTS pathname_hourly_mv_target (
        site_id UInt16,
        event_hour DateTime,
        pathname String,
        hostname String,
        pageviews SimpleAggregateFunction(sum, UInt64),
        users AggregateFunction(uniq, String),
        sessions AggregateFunction(uniq, String)
      )
      ENGINE = AggregatingMergeTree()
      PARTITION BY toYYYYMM(event_hour)
      ORDER BY (site_id, event_hour, pathname)
    `,
  });

  await clickhouse.exec({
    query: `
      CREATE MATERIALIZED VIEW IF NOT EXISTS pathname_hourly_mv
      TO pathname_hourly_mv_target
      AS SELECT
        site_id,
        toStartOfHour(timestamp) AS event_hour,
        pathname,
        any(hostname) AS hostname,
        countIf(type = 'pageview') AS pageviews,
        uniqState(user_id) AS users,
        uniqState(session_id) AS sessions
      FROM events
      WHERE type = 'pageview'
      GROUP BY site_id, event_hour, pathname
    `,
  });

  // Country/region rollup. Cardinality is naturally bounded.
  await clickhouse.exec({
    query: `
      CREATE TABLE IF NOT EXISTS country_hourly_mv_target (
        site_id UInt16,
        event_hour DateTime,
        country LowCardinality(FixedString(2)),
        region LowCardinality(String),
        pageviews SimpleAggregateFunction(sum, UInt64),
        users AggregateFunction(uniq, String),
        sessions AggregateFunction(uniq, String)
      )
      ENGINE = AggregatingMergeTree()
      PARTITION BY toYYYYMM(event_hour)
      ORDER BY (site_id, event_hour, country, region)
    `,
  });

  await clickhouse.exec({
    query: `
      CREATE MATERIALIZED VIEW IF NOT EXISTS country_hourly_mv
      TO country_hourly_mv_target
      AS SELECT
        site_id,
        toStartOfHour(timestamp) AS event_hour,
        country,
        region,
        countIf(type = 'pageview') AS pageviews,
        uniqState(user_id) AS users,
        uniqState(session_id) AS sessions
      FROM events
      GROUP BY site_id, event_hour, country, region
    `,
  });
}
