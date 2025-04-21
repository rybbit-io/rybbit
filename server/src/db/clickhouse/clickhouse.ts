import { createClient } from "@clickhouse/client";

export const createClickhouseClient = ({ readonly = false } = {}) => {
  return createClient({
    host: process.env.CLICKHOUSE_HOST,
    database: process.env.CLICKHOUSE_DB,
    username: readonly
      ? process.env.CLICKHOUSE_READONLY_USER
      : process.env.CLICKHOUSE_USER,
    password: readonly
      ? process.env.CLICKHOUSE_READONLY_PASSWORD
      : process.env.CLICKHOUSE_PASSWORD,
  });
};

// Default client with write permissions
export const clickhouseAdmin = createClickhouseClient();

// Readonly client
export const clickhouse = createClickhouseClient({ readonly: true });

export const initializeClickhouse = async () => {
  await clickhouse.command({
    query: `CREATE USER IF NOT EXISTS ${process.env.CLICKHOUSE_READONLY_USER} IDENTIFIED BY '${process.env.CLICKHOUSE_READONLY_PASSWORD}';`,
  });
  await clickhouse.command({
    query: `GRANT SELECT ON ${process.env.CLICKHOUSE_DB}.* TO ${process.env.CLICKHOUSE_READONLY_USER};`,
  });

  // Create events table
  await clickhouse.command({
    query: `
      CREATE TABLE IF NOT EXISTS events (
        site_id UInt16,
        timestamp DateTime,
        session_id String,
        user_id String,
        hostname String,
        pathname String,
        querystring String,
        page_title String,
        referrer String,
        utm_source LowCardinality(String),
        utm_medium LowCardinality(String),
        utm_campaign String,
        utm_term String,
        utm_content String,
        channel String,
        browser LowCardinality(String),
        browser_version LowCardinality(String),
        operating_system LowCardinality(String),
        operating_system_version LowCardinality(String),
        language LowCardinality(String),
        country LowCardinality(FixedString(2)),
        region LowCardinality(String),
        city String,
        latitude Float64,
        longitude Float64,
        screen_width UInt16,
        screen_height UInt16,
        device_type LowCardinality(String),
        type LowCardinality(String) DEFAULT 'pageview',
        event_name String,
        properties String
      )
      ENGINE = MergeTree()
      PARTITION BY toYYYYMM(timestamp)
      ORDER BY (site_id, timestamp)
      `,
  });

  await clickhouse.command({
    query: `
    CREATE TABLE IF NOT EXISTS sessions
    (
        site_id UInt16,
        session_id String,
        session_start DateTime,
        session_end DateTime,
        user_id String,
        pageviews UInt32,
        entry_page String,
        exit_page String,

        hostname String,
        referrer String,
        browser LowCardinality(String),
        browser_version LowCardinality(String),
        operating_system LowCardinality(String),
        operating_system_version LowCardinality(String),
        language LowCardinality(String),
        country LowCardinality(FixedString(2)),
        region LowCardinality(String),
        screen_width UInt16,
        screen_height UInt16,
        device_type LowCardinality(String),
        -- Version column for ReplacingMergeTree
        version UInt64
    )
    ENGINE = ReplacingMergeTree(version)
    PARTITION BY toYYYYMM(session_start)
    ORDER BY (site_id, session_id);
    `,
  });
  await clickhouse.command({
    query: `
    CREATE MATERIALIZED VIEW IF NOT EXISTS sessions_mv
    TO sessions
    AS
    SELECT
        site_id,
        session_id,
        min(timestamp) AS session_start,
        max(timestamp) AS session_end,
        any(user_id) AS user_id,
        countIf(type = 'pageview') AS pageviews,
        argMinIf(pathname, timestamp, type = 'pageview') AS entry_page,
        argMaxIf(pathname, timestamp, type = 'pageview') AS exit_page,

        any(hostname) AS hostname,
        any(referrer) AS referrer,
        any(browser) AS browser,
        any(browser_version) AS browser_version,
        any(operating_system) AS operating_system,
        any(operating_system_version) AS operating_system_version,
        any(language) AS language,
        any(country) AS country,
        any(region) AS region,
        any(screen_width) AS screen_width,
        any(screen_height) AS screen_height,
        any(device_type) AS device_type,
        -- Use the largest timestamp as the 'version'
        max(toUInt64(timestamp)) AS version
    FROM events
    GROUP BY
        site_id,
        session_id;
    `,
  });
};

export default clickhouse;
