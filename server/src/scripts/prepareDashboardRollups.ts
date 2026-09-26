import "dotenv/config";
import { clickhouse } from "../db/clickhouse/client.js";
import { getRollupConfig } from "../services/dashboardRollups/config.js";
import { sessionRollupDDL, sessionRollupValidation } from "../services/dashboardRollups/schema.js";
import { getRoutePatterns, routeProjectionDDL } from "../services/dashboardRollups/routes.js";
import { dimensionProjectionDDL } from "../services/dashboardRollups/projections.js";

// Deliberately does not import clickhouse.ts or server startup (which run other
// migrations). Nothing is changed unless the operator supplies --apply.
const args = new Set(process.argv.slice(2));
const allowed = ["--apply", "--materialize", "--validate"];
if ([...args].some(arg => !allowed.includes(arg)))
  throw new Error(`Usage: prepareDashboardRollups [${allowed.join("] [")}]`);
const config = getRollupConfig();
const projectionStatements = [
  ...dimensionProjectionDDL(args.has("--materialize")),
  ...routeProjectionDDL(getRoutePatterns(), args.has("--materialize")),
];
try {
  if (args.has("--validate")) {
    const status = await clickhouse.query({
      query: `SELECT status, last_success_time, exception FROM system.view_refreshes
        WHERE database = currentDatabase() AND view = {view:String}`,
      query_params: { view: config.view },
      format: "JSONEachRow",
    });
    const rows = await status.json<{ last_success_time: string }>();
    const refreshedAt = Date.parse((rows[0]?.last_success_time || "").replace(" ", "T") + "Z");
    if (!Number.isFinite(refreshedAt) || refreshedAt < Date.now() - 2 * 3600_000) {
      throw new Error("No recent successful session snapshot; leave DASHBOARD_ROLLUPS disabled");
    }
    const result = await clickhouse.query({ query: sessionRollupValidation(config), format: "JSONEachRow" });
    const failures = await result.json();
    if (failures.length) throw new Error(`Rollup resolutions disagree for ${failures.length} sites`);
    const mutations = await clickhouse.query({
      query: `SELECT table, mutation_id, command, latest_fail_reason FROM system.mutations
        WHERE database = currentDatabase() AND NOT is_done
          AND table IN ('pathname_hourly_mv_target', 'country_hourly_mv_target', 'device_type_hourly_mv_target')`,
      format: "JSONEachRow",
    });
    const unfinished = await mutations.json();
    if (unfinished.length) {
      console.log(JSON.stringify(unfinished, null, 2));
      throw new Error("Projection materialization is not complete");
    }
    for (const statement of projectionStatements) {
      const match = statement.match(/^ALTER TABLE (\w+) ADD PROJECTION IF NOT EXISTS (\w+)/);
      if (!match) continue;
      const query_params = { table: match[1], name: match[2] };
      const result = await clickhouse.query({
        query: `SELECT
          (SELECT count() FROM system.projections WHERE database = currentDatabase() AND table = {table:String} AND name = {name:String}) AS installed,
          (SELECT count() FROM system.parts WHERE database = currentDatabase() AND table = {table:String} AND active AND NOT has(projections, {name:String})) AS missing,
          (SELECT count() FROM system.projection_parts WHERE database = currentDatabase() AND table = {table:String} AND name = {name:String} AND active AND is_broken) AS broken`,
        query_params,
        format: "JSONEachRow",
      });
      const [status] = await result.json<{ installed: string; missing: string; broken: string }>();
      if (Number(status.installed) !== 1 || Number(status.missing) || Number(status.broken)) {
        throw new Error(`Projection ${match[1]}.${match[2]} is missing, incomplete, or broken`);
      }
    }
    console.log("Session snapshot is consistent across resolutions; projections cover every active source part.");
  } else {
    const statements = [...sessionRollupDDL(config), ...projectionStatements];
    if (!args.has("--apply")) console.log(statements.join(";\n\n") + ";");
    else {
      const versionResult = await clickhouse.query({ query: "SELECT version() AS version", format: "JSONEachRow" });
      const [{ version }] = await versionResult.json<{ version: string }>();
      const [major, minor] = version.split(".").map(Number);
      if (major < 26 || (major === 26 && minor < 3))
        throw new Error("Dashboard rollup preparation requires ClickHouse 26.3 or newer");
      for (const query of statements) {
        await clickhouse.command({ query, clickhouse_settings: { max_threads: 4 } });
        console.log(query.split("\n")[0]);
      }
      console.log(
        "Preparation started. Keep read flags disabled until the refresh and materialization finish; then run --validate."
      );
    }
  }
} finally {
  await clickhouse.close();
}
