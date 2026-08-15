import { clickhouseInitLogger as logger, execClickhouseInitStep, getTableColumns } from "../initUtils.js";

type ColumnDefinition = {
  name: string;
  definition: string;
};

const EVENTS_COLUMNS_TO_ENSURE: ColumnDefinition[] = [
  { name: "lcp", definition: "lcp Nullable(Float64)" },
  { name: "cls", definition: "cls Nullable(Float64)" },
  { name: "inp", definition: "inp Nullable(Float64)" },
  { name: "fcp", definition: "fcp Nullable(Float64)" },
  { name: "ttfb", definition: "ttfb Nullable(Float64)" },
  { name: "ip", definition: "ip Nullable(String)" },
  { name: "timezone", definition: "timezone LowCardinality(String) DEFAULT ''" },
  { name: "identified_user_id", definition: "identified_user_id String DEFAULT ''" },
  { name: "import_id", definition: "import_id Nullable(UUID)" },
  { name: "tag", definition: "tag LowCardinality(String) DEFAULT ''" },
  { name: "feature_flags", definition: "feature_flags Map(String, String) DEFAULT map()" },
  { name: "asn", definition: "asn Nullable(UInt32)" },
  { name: "asn_org", definition: "asn_org LowCardinality(String) DEFAULT ''" },
  { name: "is_datacenter_asn", definition: "is_datacenter_asn UInt8 DEFAULT 0" },
];

const BOT_EVENTS_COLUMNS_TO_ENSURE: ColumnDefinition[] = [
  // Prod tables created before session_id landed in the CREATE statement lack
  // it; the insert already sends it, so healing the column starts populating it.
  { name: "session_id", definition: "session_id String DEFAULT ''" },
  // Null = the client sent no score and the server inferred nothing.
  { name: "client_bot_score", definition: "client_bot_score Nullable(UInt8)" },
  { name: "client_signal_mask", definition: "client_signal_mask UInt16 DEFAULT 0" },
];

async function ensureBotEventsColumns() {
  const existingColumns = await getTableColumns("bot_events");
  const missingColumns = BOT_EVENTS_COLUMNS_TO_ENSURE.filter(column => !existingColumns.has(column.name));

  if (missingColumns.length === 0) {
    logger.debug("Bot events table columns are up to date");
    return;
  }

  logger.info(
    { missingColumns: missingColumns.map(column => column.name) },
    "Adding missing bot events table columns"
  );

  await execClickhouseInitStep(
    "add missing bot events columns",
    `
      ALTER TABLE bot_events
        ${missingColumns.map(column => `ADD COLUMN IF NOT EXISTS ${column.definition}`).join(",\n        ")}
      `,
    { lockAcquireTimeoutSeconds: 15 }
  );
}

async function ensureEventsColumns() {
  const existingColumns = await getTableColumns("events");
  const missingColumns = EVENTS_COLUMNS_TO_ENSURE.filter(column => !existingColumns.has(column.name));

  if (missingColumns.length === 0) {
    logger.debug("Events table columns are up to date");
    return;
  }

  logger.info({ missingColumns: missingColumns.map(column => column.name) }, "Adding missing events table columns");

  await execClickhouseInitStep(
    "add missing events columns",
    `
      ALTER TABLE events
        ${missingColumns.map(column => `ADD COLUMN IF NOT EXISTS ${column.definition}`).join(",\n        ")}
      `,
    { lockAcquireTimeoutSeconds: 15 }
  );
}

export async function initializeCoreTables() {
  await execClickhouseInitStep(
    "create events table",
    `
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
        props JSON,
        lcp Nullable(Float64),
        cls Nullable(Float64),
        inp Nullable(Float64),
        fcp Nullable(Float64),
        ttfb Nullable(Float64),
        ip Nullable(String),
        timezone LowCardinality(String) DEFAULT '',
        identified_user_id String DEFAULT '',
        import_id Nullable(UUID),
        tag LowCardinality(String) DEFAULT '',
        feature_flags Map(String, String) DEFAULT map(),
        asn Nullable(UInt32),
        asn_org LowCardinality(String) DEFAULT '',
        is_datacenter_asn UInt8 DEFAULT 0
      )
      ENGINE = MergeTree()
      PARTITION BY toYYYYMM(timestamp)
      ORDER BY (site_id, timestamp)
      `
  );

  // Heal tables created by older versions (or by the window where the CREATE
  // TABLE above was missing these columns). Only columns that are actually
  // missing are altered in — even a no-op ALTER needs the events table ALTER lock.
  await ensureEventsColumns();

  await execClickhouseInitStep(
    "create bot events table",
    `
      CREATE TABLE IF NOT EXISTS bot_events (
        site_id UInt16,
        timestamp DateTime,
        session_id String,
        user_id String,
        hostname String,
        pathname String,
        querystring String,
        referrer String,
        browser LowCardinality(String),
        browser_version LowCardinality(String),
        operating_system LowCardinality(String),
        operating_system_version LowCardinality(String),
        country LowCardinality(FixedString(2)),
        region LowCardinality(String),
        city String,
        lat Float64,
        lon Float64,
        screen_width UInt16,
        screen_height UInt16,
        device_type LowCardinality(String),
        type LowCardinality(String) DEFAULT 'pageview',
        asn Nullable(UInt32),
        asn_org String DEFAULT '',
        detected_ua_pattern Bool DEFAULT false,
        detected_header_heuristics Bool DEFAULT false,
        detected_client_signals Bool DEFAULT false,
        detected_bot_asn Bool DEFAULT false,
        detected_rate_anomaly Bool DEFAULT false,
        matched_ua_pattern String DEFAULT '',
        bot_category LowCardinality(String) DEFAULT '',
        client_bot_score Nullable(UInt8),
        client_signal_mask UInt16 DEFAULT 0
      )
      ENGINE = MergeTree()
      PARTITION BY toYYYYMM(timestamp)
      ORDER BY (site_id, timestamp)
      TTL timestamp + INTERVAL 3 MONTH
      `
  );

  await ensureBotEventsColumns();

  await execClickhouseInitStep(
    "create session replay events table",
    `
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
      `
  );

  await execClickhouseInitStep(
    "add session replay events columns",
    `
      ALTER TABLE session_replay_events
        ADD COLUMN IF NOT EXISTS event_data_key Nullable(String), -- R2 storage key for cloud deployments
        ADD COLUMN IF NOT EXISTS batch_index Nullable(UInt16), -- Index within the R2 batch
        ADD COLUMN IF NOT EXISTS identified_user_id String DEFAULT ''
      `
  );

  await execClickhouseInitStep(
    "create session replay metadata table",
    `
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
      `
  );

  await execClickhouseInitStep(
    "add session replay metadata columns",
    `
      ALTER TABLE session_replay_metadata
        ADD COLUMN IF NOT EXISTS identified_user_id String DEFAULT ''
      `
  );
}
