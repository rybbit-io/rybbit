import { execClickhouseInitStep, getTableColumns } from "../initUtils.js";

// IP intelligence beyond what MaxMind provides. Only the paid provider fills
// these, so they stay out of the core schema — asn/asn_org live there instead.
const IP_INTEL_COLUMNS_TO_ENSURE = [
  { name: "company", definition: "company String DEFAULT ''" },
  { name: "company_domain", definition: "company_domain String DEFAULT ''" },
  { name: "company_type", definition: "company_type LowCardinality(String) DEFAULT ''" },
  { name: "company_abuse_score", definition: "company_abuse_score Nullable(Float64)" },
  { name: "asn_domain", definition: "asn_domain String DEFAULT ''" },
  { name: "asn_type", definition: "asn_type LowCardinality(String) DEFAULT ''" },
  { name: "asn_abuse_score", definition: "asn_abuse_score Nullable(Float64)" },
  { name: "vpn", definition: "vpn LowCardinality(String) DEFAULT ''" },
  { name: "crawler", definition: "crawler LowCardinality(String) DEFAULT ''" },
  { name: "datacenter", definition: "datacenter LowCardinality(String) DEFAULT ''" },
  { name: "is_proxy", definition: "is_proxy Nullable(Boolean)" },
  { name: "is_tor", definition: "is_tor Nullable(Boolean)" },
  { name: "is_satellite", definition: "is_satellite Nullable(Boolean)" },
];

async function ensureIpIntelColumns() {
  const existingColumns = await getTableColumns("events");
  const missingColumns = IP_INTEL_COLUMNS_TO_ENSURE.filter(column => !existingColumns.has(column.name));

  if (missingColumns.length === 0) {
    return;
  }

  await execClickhouseInitStep(
    "add missing IP intel columns",
    `
      ALTER TABLE events
        ${missingColumns.map(column => `ADD COLUMN IF NOT EXISTS ${column.definition}`).join(",\n        ")}
      `,
    { lockAcquireTimeoutSeconds: 15 }
  );
}

// Hourly per-site event counts, used by cloud usage tracking / billing.
export async function initializeCloudTables() {
  await ensureIpIntelColumns();

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
