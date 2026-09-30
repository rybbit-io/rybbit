import { clickhouse } from "../../db/clickhouse/clickhouse.js";

const RETAINED_METADATA_TABLES = ["session_replay_metadata", "session_replay_metadata_v2_backfill"];

/** Apply privacy deletion to active metadata and any retained rollback copies. */
export async function deleteReplayMetadata(where: string, queryParams: Record<string, unknown>): Promise<void> {
  const result = await clickhouse.query({
    query: `SELECT name FROM system.tables
      WHERE database = currentDatabase() AND name IN {tables:Array(String)}`,
    query_params: { tables: RETAINED_METADATA_TABLES },
    format: "JSONEachRow",
  });
  const retained = await result.json<{ name: string }>();
  const existing = new Set(retained.map(row => row.name));
  const tables = ["session_replay_metadata_v2", ...RETAINED_METADATA_TABLES.filter(table => existing.has(table))];
  await Promise.all(
    tables.map(table =>
      clickhouse.command({
        query: `DELETE FROM ${table} WHERE ${where}`,
        query_params: queryParams,
      })
    )
  );
}
