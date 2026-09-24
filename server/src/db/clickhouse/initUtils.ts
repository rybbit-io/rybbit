import { createServiceLogger } from "../../lib/logger/logger.js";
import { CLICKHOUSE_REQUEST_TIMEOUT_MS, clickhouse } from "./client.js";

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

export async function getTableColumns(table: string) {
  const result = await clickhouse.query({
    query: `
      SELECT name
      FROM system.columns
      WHERE database = currentDatabase()
        AND table = {table:String}
    `,
    query_params: { table },
    format: "JSONEachRow",
  });

  const rows = await result.json<{ name: string }>();
  return new Set(rows.map(row => row.name));
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
