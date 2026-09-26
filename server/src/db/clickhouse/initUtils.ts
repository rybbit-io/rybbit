import { createServiceLogger } from "../../lib/logger/logger.js";
import { CLICKHOUSE_REQUEST_TIMEOUT_MS, clickhouse } from "./client.js";
import type { TimeColumnDefinition } from "./timeColumns.js";

export const clickhouseInitLogger = createServiceLogger("clickhouse");

export async function execClickhouseInitStep(
  step: string,
  query: string,
  options?: { optional?: boolean; lockAcquireTimeoutSeconds?: number }
) {
  try {
    await clickhouse.exec({
      query,
      clickhouse_settings: options?.lockAcquireTimeoutSeconds
        ? { lock_acquire_timeout: options.lockAcquireTimeoutSeconds }
        : undefined,
    });
  } catch (error) {
    clickhouseInitLogger.error(
      { err: error, step, requestTimeoutMs: CLICKHOUSE_REQUEST_TIMEOUT_MS },
      "ClickHouse initialization step failed"
    );
    if (!options?.optional) {
      throw error;
    }
  }
}

/** Existing columns of a table, keyed by name, valued by ClickHouse type text. */
export async function getTableColumns(table: string) {
  const result = await clickhouse.query({
    query: `
      SELECT name, type
      FROM system.columns
      WHERE database = currentDatabase()
        AND table = {table:String}
    `,
    query_params: { table },
    format: "JSONEachRow",
  });

  const rows = await result.json<{ name: string; type: string }>();
  return new Map(rows.map(row => [row.name, row.type]));
}

/**
 * Pins the timezone of a table's existing time columns to UTC.
 *
 * A bare `DateTime` column takes the server's configured timezone, so a
 * self-hosted ClickHouse set to Europe/Berlin read every stored epoch two hours
 * off from what the UTC-explicit query layer assumes. The stored value is an
 * epoch whichever timezone the type carries, so `MODIFY COLUMN` between
 * timezones is metadata-only: no part is rewritten, and ClickHouse allows it
 * on partition-key, sorting-key and SimpleAggregateFunction columns alike
 * (verified on 26.3). Columns that already carry `'UTC'` are left alone, and a
 * column the table does not have yet is skipped — the CREATE / ADD COLUMN
 * statements declare it in UTC.
 *
 * On a server whose timezone is not UTC, existing month partitions keep the
 * names they got in that timezone; the self-hosting docs cover rebuilding them.
 *
 * Optional because writers send explicit-UTC instants regardless: a failed
 * ALTER leaves the pre-fix behaviour for reads on a non-UTC server, which is
 * not worth refusing to start over.
 */
export async function ensureUtcTimeColumns(table: string, columns: TimeColumnDefinition[]) {
  const existingColumns = await getTableColumns(table);
  const outdatedColumns = columns.filter(column => {
    const currentType = existingColumns.get(column.name);
    return currentType !== undefined && !currentType.includes("'UTC'");
  });

  if (outdatedColumns.length === 0) {
    clickhouseInitLogger.debug({ table }, "Time columns are already pinned to UTC");
    return;
  }

  clickhouseInitLogger.info(
    { table, columns: outdatedColumns.map(column => column.name) },
    "Pinning time columns to UTC"
  );

  await execClickhouseInitStep(
    `pin ${table} time columns to UTC`,
    `
      ALTER TABLE ${table}
        ${outdatedColumns.map(column => `MODIFY COLUMN ${column.name} ${column.type}`).join(",\n        ")}
      `,
    { optional: true, lockAcquireTimeoutSeconds: 15 }
  );

}

export async function getTableCreateQuery(table: string) {
  const result = await clickhouse.query({
    query: `
      SELECT create_table_query
      FROM system.tables
      WHERE database = currentDatabase()
        AND name = {table:String}
      LIMIT 1
    `,
    query_params: { table },
    format: "JSONEachRow",
  });

  const rows = await result.json<{ create_table_query: string }>();
  return rows[0]?.create_table_query;
}
