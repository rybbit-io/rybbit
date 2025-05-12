import { createClient } from "@clickhouse/client";

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
};

export default clickhouse;
