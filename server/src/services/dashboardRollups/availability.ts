import { clickhouse } from "../../db/clickhouse/client.js";
import { getRollupConfig, RollupConfig } from "./config.js";

let cached: { table: string; expires: number; ready: boolean } | undefined;
let pending: { table: string; promise: Promise<boolean> } | undefined;

export function invalidateSessionRollups() {
  if (cached) cached = { ...cached, ready: false, expires: Date.now() + 30_000 };
}

export async function availableSessionRollups(): Promise<RollupConfig | null> {
  if (process.env.DASHBOARD_ROLLUPS !== "true") return null;
  let config: RollupConfig;
  try {
    config = getRollupConfig();
  } catch {
    return null;
  }
  const { table, view } = config;
  if (cached?.table === table && cached.expires > Date.now()) return cached.ready ? config : null;
  if (pending?.table !== table) {
    const promise = (async () => {
      try {
        const result = await clickhouse.query({
          query: `SELECT count() AS ready FROM system.view_refreshes
            WHERE database = currentDatabase() AND view = {view:String}
              AND last_success_time > now() - INTERVAL 2 HOUR
              AND EXISTS (SELECT 1 FROM system.tables WHERE database = currentDatabase() AND name = {table:String})`,
          query_params: { table, view },
          format: "JSONEachRow",
          abort_signal: AbortSignal.timeout(2_000),
          clickhouse_settings: { max_execution_time: 2 },
        });
        const rows = await result.json<{ ready: number | string }>();
        return Number(rows[0]?.ready) > 0;
      } catch {
        return false;
      }
    })();
    pending = { table, promise };
  }
  const current = pending;
  const ready = await current.promise;
  cached = { table, ready, expires: Date.now() + 30_000 };
  if (pending === current) pending = undefined;
  return ready ? config : null;
}
