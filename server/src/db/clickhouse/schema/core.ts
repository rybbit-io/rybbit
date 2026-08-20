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
  // Which anomaly rules fired and what they summed to. "Rate anomaly" is a
  // dozen rules with different meanings, so without these an audit row cannot
  // say why the request was convicted.
  { name: "anomaly_reasons", definition: "anomaly_reasons String DEFAULT ''" },
  { name: "anomaly_score", definition: "anomaly_score UInt8 DEFAULT 0" },
];

// Runs against both audit tables: they carry the same columns on purpose, so a
// column added to one has to reach the other or the shared queries stop working.
async function ensureBotEventsColumns(table: "bot_events" | "bot_observations") {
  const existingColumns = await getTableColumns(table);
  const missingColumns = BOT_EVENTS_COLUMNS_TO_ENSURE.filter(column => !existingColumns.has(column.name));

  if (missingColumns.length === 0) {
    logger.debug({ table }, "Bot events table columns are up to date");
    return;
  }

  logger.info({ table, missingColumns: missingColumns.map(column => column.name) }, "Adding missing bot table columns");

  await execClickhouseInitStep(
    `add missing ${table} columns`,
    `
      ALTER TABLE ${table}
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
        client_signal_mask UInt16 DEFAULT 0,
        anomaly_reasons String DEFAULT '',
        anomaly_score UInt8 DEFAULT 0
      )
      ENGINE = MergeTree()
      PARTITION BY toYYYYMM(timestamp)
      ORDER BY (site_id, timestamp)
      TTL timestamp + INTERVAL 3 MONTH
      `
  );

  await ensureBotEventsColumns("bot_events");

  // Forensic mirror of bot_events for sites with bot blocking turned OFF: the
  // event is still tracked normally, and this row is the only trace that
  // detection fired. Columns match bot_events exactly so the same analysis
  // queries run against either table; only the TTL is shorter.
  await execClickhouseInitStep(
    "create bot observations table",
    `
      CREATE TABLE IF NOT EXISTS bot_observations (
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
        client_signal_mask UInt16 DEFAULT 0,
        anomaly_reasons String DEFAULT '',
        anomaly_score UInt8 DEFAULT 0
      )
      ENGINE = MergeTree()
      PARTITION BY toYYYYMM(timestamp)
      ORDER BY (site_id, timestamp)
      TTL timestamp + INTERVAL 30 DAY
      `
  );

  await ensureBotEventsColumns("bot_observations");

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

  // Successor to session_replay_metadata. The old table is a
  // ReplacingMergeTree holding one cumulative row per session, so every replay
  // batch had to re-derive that row: SELECT MIN/MAX/COUNT/SUM over the whole
  // session, then rewrite it. That read scanned 818 B rows in six days — 76% of
  // everything the cluster read — and the rewrites left 2.5 M single-row parts.
  //
  // Aggregating the columns instead lets each batch insert only what it
  // observed, and the engine does the combining. Nothing reads back during
  // ingest. Every column keeps its name and its post-merge meaning, so readers
  // only need FINAL, which they already used.
  //
  // duration_ms and created_at are deliberately absent: duration is derived
  // from the merged bounds at read time, and there is no version column to
  // order by any more.
  await execClickhouseInitStep(
    "create session replay metadata v2 table",
    `
      CREATE TABLE IF NOT EXISTS session_replay_metadata_v2 (
        site_id UInt16,
        session_id String,
        user_id SimpleAggregateFunction(anyLast, String),
        -- Rows arrive with '' until the visitor identifies, and max() over a
        -- String makes any real id win over the empty one.
        identified_user_id SimpleAggregateFunction(max, String),
        -- Millisecond resolution, matching session_replay_events.timestamp:
        -- duration is now derived from these bounds instead of being stored,
        -- and second-resolution columns would floor a 900ms replay to 0.
        start_time SimpleAggregateFunction(min, DateTime64(3)),
        end_time SimpleAggregateFunction(max, Nullable(DateTime64(3))),
        event_count SimpleAggregateFunction(sum, UInt64),
        compressed_size_bytes SimpleAggregateFunction(sum, UInt64),
        -- KNOWN LIMITATION. These merge independently, so a session whose
        -- batches disagreed can assemble a row from more than one of them —
        -- the old ReplacingMergeTree always returned one whole batch's
        -- snapshot. Measured over 30 days of production, of the 423 sessions
        -- that had more than one metadata version: page_url differed in 62,
        -- region/city/lat in 18, country in 11, language in 13; browser,
        -- operating_system, device_type, channel, hostname, referrer and
        -- user_id never differed at all.
        --
        -- The geo group is the one that matters, because those fields are only
        -- meaningful together: ~4% of multi-version sessions could show a city
        -- and a country drawn from different batches. Making them coherent
        -- needs one versioned snapshot (a max() over a leading-version tuple,
        -- or argMaxState + GROUP BY), which changes every read site.
        --
        -- Weighed and accepted, 2026-08: the exposure is narrow and the fix
        -- costs more than the defect. Don't re-open it without new evidence
        -- that mixed geo is actually misleading someone.
        page_url SimpleAggregateFunction(anyLast, String),
        country SimpleAggregateFunction(anyLast, LowCardinality(FixedString(2))),
        region SimpleAggregateFunction(anyLast, LowCardinality(String)),
        city SimpleAggregateFunction(anyLast, String),
        lat SimpleAggregateFunction(anyLast, Float64),
        lon SimpleAggregateFunction(anyLast, Float64),
        browser SimpleAggregateFunction(anyLast, LowCardinality(String)),
        browser_version SimpleAggregateFunction(anyLast, LowCardinality(String)),
        operating_system SimpleAggregateFunction(anyLast, LowCardinality(String)),
        operating_system_version SimpleAggregateFunction(anyLast, LowCardinality(String)),
        language SimpleAggregateFunction(anyLast, LowCardinality(String)),
        screen_width SimpleAggregateFunction(max, UInt16),
        screen_height SimpleAggregateFunction(max, UInt16),
        device_type SimpleAggregateFunction(anyLast, LowCardinality(String)),
        channel SimpleAggregateFunction(anyLast, String),
        hostname SimpleAggregateFunction(anyLast, String),
        referrer SimpleAggregateFunction(anyLast, String),
        has_replay_data SimpleAggregateFunction(max, UInt8)
      )
      ENGINE = AggregatingMergeTree()
      PARTITION BY toYYYYMM(start_time)
      ORDER BY (site_id, session_id)
      TTL toDateTime(start_time) + INTERVAL 30 DAY
      `
  );
}
