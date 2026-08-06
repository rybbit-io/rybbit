import { clickhouseInitLogger as logger, execClickhouseInitStep, getTableCreateQuery } from "../initUtils.js";

const SESSION_HOURLY_MV_NAME = "session_hourly_mv";
const SESSION_HOURLY_MV_REFRESH_INTERVAL = "REFRESH EVERY 1 HOUR";
const SESSION_HOURLY_MV_SOURCE = "sessions_mv_target FINAL";

const SESSION_HOURLY_MV_CREATE_QUERY = `
  CREATE MATERIALIZED VIEW ${SESSION_HOURLY_MV_NAME}
  ${SESSION_HOURLY_MV_REFRESH_INTERVAL}
  TO session_hourly_mv_target
  AS
  SELECT
    site_id,
    toStartOfHour(start_time) AS session_hour,
    count() AS sessions,
    sum(session_pageviews) AS pageviews,
    uniqState(user_id) AS users,
    sum(toUInt64(end_time - start_time)) AS total_session_duration_seconds,
    countIf(session_pageviews = 1) AS bounced_sessions
  FROM (
    SELECT
      site_id,
      user_id,
      start_time,
      end_time,
      pageviews AS session_pageviews
    FROM ${SESSION_HOURLY_MV_SOURCE}
  ) AS sessions
  GROUP BY site_id, session_hour
`;

async function ensureSessionHourlyMaterializedView() {
  const existingCreateQuery = await getTableCreateQuery(SESSION_HOURLY_MV_NAME);
  const isCurrent =
    existingCreateQuery?.includes(SESSION_HOURLY_MV_REFRESH_INTERVAL) &&
    existingCreateQuery.includes(SESSION_HOURLY_MV_SOURCE);

  if (isCurrent) {
    logger.debug("Session hourly materialized view is up to date");
    return;
  }

  if (existingCreateQuery) {
    logger.info("Replacing outdated session hourly materialized view");
    await execClickhouseInitStep(
      "drop outdated session hourly materialized view",
      `DROP VIEW IF EXISTS ${SESSION_HOURLY_MV_NAME} SYNC`,
      { lockAcquireTimeoutSeconds: 15 }
    );
  }

  await execClickhouseInitStep("create session hourly materialized view", SESSION_HOURLY_MV_CREATE_QUERY);
}

// Materialized views that back the simplified high-traffic dashboard.
// All views are hourly-bucketed and feed the lite endpoints; raw `events`
// is still queried for filters that aren't keyed in these MVs.
export async function initializeLiteDashboardMVs() {
  // Per-session rollup. Replaces the AllSessionPageviews / FilteredSessions
  // CTEs that getOverview and getOverviewBucketed run over raw events.
  //
  // This is a streaming MV: it fires once per inserted block and writes a
  // PARTIAL session row for whatever events were in that block. AggregatingMergeTree
  // then composes the SimpleAggregateFunction columns (min/max/sum) across parts
  // sharing (site_id, session_id), and the read queries additionally re-aggregate
  // by session_id at query time — so pageviews/start_time/end_time are always
  // correct even before merges complete.
  //
  // The plain metadata columns below (country, region, device_type, browser,
  // operating_system, hostname) are session-INVARIANT, so every partial row of a
  // session carries the same value and `any()` is well-defined. Entry/acquisition
  // attributes (entry_page, referrer, channel) are deliberately NOT stored here:
  // they are first-event values that differ across a session's blocks, can't be
  // composed correctly per-partial-row, and so are served by the raw-events
  // fallback instead (see LITE_SESSION_FILTER_COLUMNS in lite/utils.ts).
  await execClickhouseInitStep(
    "create sessions rollup target table",
    `
      CREATE TABLE IF NOT EXISTS sessions_mv_target (
        site_id UInt16,
        session_id String,
        user_id String,
        start_time SimpleAggregateFunction(min, DateTime),
        end_time SimpleAggregateFunction(max, DateTime),
        pageviews SimpleAggregateFunction(sum, UInt64),
        events SimpleAggregateFunction(sum, UInt64),
        country LowCardinality(FixedString(2)),
        region LowCardinality(String),
        device_type LowCardinality(String),
        browser LowCardinality(String),
        operating_system LowCardinality(String),
        hostname String,
        last_seen SimpleAggregateFunction(max, DateTime)
      )
      ENGINE = AggregatingMergeTree()
      PARTITION BY toYYYYMM(start_time)
      ORDER BY (site_id, session_id)
    `
  );

  await execClickhouseInitStep(
    "create sessions rollup materialized view",
    `
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
        any(hostname) AS hostname,
        max(timestamp) AS last_seen
      FROM events
      GROUP BY site_id, session_id
    `
  );

  // Hourly overview rollup. Drives the bucketed chart and overview cards.
  await execClickhouseInitStep(
    "create hourly overview rollup target table",
    `
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
    `
  );

  await execClickhouseInitStep(
    "create hourly overview rollup materialized view",
    `
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
    `
  );

  // Top-pathname rollup. Cardinality is bounded by hour, so high-URL sites
  // still get smaller-than-raw storage. Filtered queries fall back to events.
  await execClickhouseInitStep(
    "create hourly pathname rollup target table",
    `
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
    `
  );

  await execClickhouseInitStep(
    "create hourly pathname rollup materialized view",
    `
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
    `
  );

  // Country/region rollup. Cardinality is naturally bounded.
  await execClickhouseInitStep(
    "create hourly country rollup target table",
    `
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
    `
  );

  await execClickhouseInitStep(
    "create hourly country rollup materialized view",
    `
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
    `
  );

  // Device-type rollup.
  await execClickhouseInitStep(
    "create hourly device type rollup target table",
    `
      CREATE TABLE IF NOT EXISTS device_type_hourly_mv_target (
        site_id UInt16,
        event_hour DateTime,
        device_type LowCardinality(String),
        pageviews SimpleAggregateFunction(sum, UInt64),
        users AggregateFunction(uniq, String),
        sessions AggregateFunction(uniq, String)
      )
      ENGINE = AggregatingMergeTree()
      PARTITION BY toYYYYMM(event_hour)
      ORDER BY (site_id, event_hour, device_type)
    `
  );

  await execClickhouseInitStep(
    "create hourly device type rollup materialized view",
    `
      CREATE MATERIALIZED VIEW IF NOT EXISTS device_type_hourly_mv
      TO device_type_hourly_mv_target
      AS SELECT
        site_id,
        toStartOfHour(timestamp) AS event_hour,
        device_type,
        countIf(type = 'pageview') AS pageviews,
        uniqState(user_id) AS users,
        uniqState(session_id) AS sessions
      FROM events
      GROUP BY site_id, event_hour, device_type
    `
  );

  // Session-keyed hourly rollup, populated by a REFRESHABLE materialized view.
  // Streaming MVs can't compute bounce_rate or session_duration because they
  // see one event at a time, never the full per-session state. The refreshable
  // MV compacts the already-populated per-session rollup hourly instead of
  // repeatedly rebuilding sessions from every raw event.
  await execClickhouseInitStep(
    "create session hourly rollup target table",
    `
      CREATE TABLE IF NOT EXISTS session_hourly_mv_target (
        site_id UInt16,
        session_hour DateTime,
        sessions UInt64,
        pageviews UInt64,
        users AggregateFunction(uniq, String),
        total_session_duration_seconds UInt64,
        bounced_sessions UInt64
      )
      ENGINE = MergeTree()
      PARTITION BY toYYYYMM(session_hour)
      ORDER BY (site_id, session_hour)
    `
  );

  // CREATE IF NOT EXISTS cannot update an already-installed view. Inspect the
  // stored definition so deployments replace the old five-minute raw-events
  // refresh once, while subsequent startups remain no-ops.
  await ensureSessionHourlyMaterializedView();
}
