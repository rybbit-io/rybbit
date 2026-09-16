import { createServiceLogger } from "../../lib/logger/logger.js";
import { CLICKHOUSE_REQUEST_TIMEOUT_MS, clickhouse } from "./client.js";
import { misplacedPartitionRowsCondition, type TimeColumnDefinition } from "./timeColumns.js";

export const clickhouseInitLogger = createServiceLogger("clickhouse");

/** Runs one init statement. Returns false only for an optional step that failed. */
export async function execClickhouseInitStep(
  step: string,
  query: string,
  options?: { optional?: boolean; lockAcquireTimeoutSeconds?: number }
): Promise<boolean> {
  try {
    await clickhouse.exec({
      query,
      clickhouse_settings: options?.lockAcquireTimeoutSeconds
        ? { lock_acquire_timeout: options.lockAcquireTimeoutSeconds }
        : undefined,
    });
    return true;
  } catch (error) {
    clickhouseInitLogger.error(
      { err: error, step, requestTimeoutMs: CLICKHOUSE_REQUEST_TIMEOUT_MS },
      "ClickHouse initialization step failed"
    );
    if (!options?.optional) {
      throw error;
    }
    return false;
  }
}

let serverTimezone: Promise<string> | undefined;

/** The server's configured timezone, e.g. "UTC" or "Europe/Berlin". Cached per process. */
export function getServerTimezone() {
  serverTimezone ??= clickhouse
    .query({ query: "SELECT timezone() AS timezone", format: "JSONEachRow" })
    .then(async result => (await result.json<{ timezone: string }>())[0]?.timezone ?? "UTC");
  return serverTimezone;
}

/** Test hook: the timezone is cached for the process lifetime. */
export function resetServerTimezoneCache() {
  serverTimezone = undefined;
}

export async function countMisplacedPartitionRows(table: string, column: string) {
  const result = await clickhouse.query({
    query: `SELECT count() AS misplaced FROM ${table} WHERE ${misplacedPartitionRowsCondition(column)}`,
    format: "JSONEachRow",
  });
  const rows = await result.json<{ misplaced: string | number }>();
  return Number(rows[0]?.misplaced ?? 0);
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
 * On a server whose timezone is not UTC the month partitions of existing rows
 * were named in that timezone, and after the ALTER ClickHouse prunes them in
 * UTC, so rows within the old offset of a month boundary can be skipped by a
 * query window that stays inside those hours. The migration counts such rows
 * and points at scripts/repairUtcPartitions.ts, which rebuilds the table; it
 * does not rebuild automatically because that copies every row and the same
 * installs usually also carry mis-stored instants the operator has to decide
 * about. A UTC server has no misplaced rows and skips the count.
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

  const altered = await execClickhouseInitStep(
    `pin ${table} time columns to UTC`,
    `
      ALTER TABLE ${table}
        ${outdatedColumns.map(column => `MODIFY COLUMN ${column.name} ${column.type}`).join(",\n        ")}
      `,
    { optional: true, lockAcquireTimeoutSeconds: 15 }
  );

  const partitionColumn = outdatedColumns.find(column => column.partitionKey);
  if (!altered || !partitionColumn || (await getServerTimezone()) === "UTC") {
    return;
  }

  try {
    const misplaced = await countMisplacedPartitionRows(table, partitionColumn.name);
    if (misplaced > 0) {
      clickhouseInitLogger.error(
        { table, column: partitionColumn.name, misplaced },
        "Rows sit in month partitions named under the old server timezone and can be skipped by narrow " +
          "time-window queries; run `npm run repair:utc-partitions` (see docs: self-hosting-advanced → ClickHouse timezone)"
      );
    }
  } catch (error) {
    clickhouseInitLogger.error({ err: error, table }, "Could not count misplaced partition rows");
  }
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
