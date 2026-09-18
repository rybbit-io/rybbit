import { clickhouse } from "./client.js";
import { countMisplacedPartitionRows, getServerTimezone } from "./initUtils.js";
import { UTC_TIME_TABLES, type UtcTimeTable } from "./timeColumns.js";

/**
 * Rebuilds tables whose month partitions were named under a non-UTC server
 * timezone (see ensureUtcTimeColumns). Driven by scripts/repairUtcPartitions.ts.
 *
 * Each table is copied (CREATE TABLE ... AS, INSERT SELECT *), the copy is
 * validated and swapped in with EXCHANGE TABLES, and the original is kept as
 * `<table>_utc_repair_backup` until the operator drops it. Materialized views
 * do not fire on the copy and stay attached to the name after the swap. The
 * copy is a plain row-for-row rebuild, so running it twice is wasteful but
 * never wrong.
 *
 * Writers must be stopped: a row inserted after the copy is taken lives only
 * in the backup. The operator attests to that with --backend-stopped, and the
 * script still refuses when it can see activity (running inserts, a pending
 * async-insert queue, or recent inserts in the query log where one exists).
 */

export const ALL_TABLES = Object.keys(UTC_TIME_TABLES) as UtcTimeTable[];
export const BACKUP_SUFFIX = "_utc_repair_backup";
export const COPY_SUFFIX = "_utc_repair";
const LIVE_WRITE_WINDOW_SECONDS = 120;

export type RepairOptions = {
  apply: boolean;
  tables: UtcTimeTable[];
  backendStopped: boolean;
  dropBackups: boolean;
};

export function parseArgs(argv: string[]): RepairOptions {
  const opts: RepairOptions = { apply: false, tables: ALL_TABLES, backendStopped: false, dropBackups: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--apply") opts.apply = true;
    else if (arg === "--backend-stopped") opts.backendStopped = true;
    else if (arg === "--drop-backups") opts.dropBackups = true;
    else if (arg === "--tables") {
      const value = argv[++i];
      if (value === undefined) throw new Error("--tables needs a value");
      opts.tables = value
        .split(",")
        .map(name => name.trim())
        .filter(Boolean)
        .map(name => {
          if (!(name in UTC_TIME_TABLES)) throw new Error(`Unknown table ${name}; known: ${ALL_TABLES.join(", ")}`);
          return name as UtcTimeTable;
        });
    } else throw new Error(`Unknown argument ${arg}`);
  }
  return opts;
}

async function queryOne<T>(query: string, query_params?: Record<string, string>): Promise<T | undefined> {
  const result = await clickhouse.query({ query, query_params, format: "JSONEachRow" });
  return (await result.json<T>())[0];
}

async function tableEngine(table: string) {
  const row = await queryOne<{ engine: string }>(
    "SELECT engine FROM system.tables WHERE database = currentDatabase() AND name = {table:String}",
    { table }
  );
  return row?.engine;
}

/**
 * Row count that survives the copy: engines that fold rows on merge
 * (Aggregating/Summing/Replacing/Collapsing) are counted after FINAL on both
 * sides, since the copy's parts may merge before we compare. The copy is
 * row-for-row, so the folded groups are identical.
 */
async function comparableRowCount(table: string, engine: string) {
  const final = /(Aggregating|Summing|Replacing|Collapsing)MergeTree/.test(engine) ? " FINAL" : "";
  const row = await queryOne<{ n: string | number }>(`SELECT count() AS n FROM ${table}${final}`);
  return Number(row?.n ?? 0);
}

/**
 * Evidence of writers still running. Each signal is optional (the shipped
 * docker-compose removes query_log; older servers lack the async-insert
 * table), and none can prove the absence of writers, which is what
 * --backend-stopped attests to.
 */
export async function liveWriteEvidence(table: string): Promise<string[]> {
  const evidence: string[] = [];
  const count = async (query: string) => Number((await queryOne<{ n: string | number }>(query, { table }))?.n ?? 0);

  // Any running INSERT counts: with the backend stopped there should be none,
  // and matching the target table by name would miss qualified, quoted or
  // multi-line statements.
  const running = await count(
    `SELECT count() AS n FROM system.processes WHERE query_kind = 'Insert' AND query NOT LIKE '%${COPY_SUFFIX}%'`
  );
  if (running > 0) evidence.push(`${running} INSERT running now`);

  try {
    await clickhouse.exec({ query: "SYSTEM FLUSH ASYNC INSERT QUEUE" });
    const pending = await count(
      `SELECT count() AS n FROM system.asynchronous_inserts WHERE database = currentDatabase() AND table = {table:String}`
    );
    if (pending > 0) evidence.push(`${pending} async inserts still queued for ${table}`);
  } catch {
    // No async-insert queue on this server.
  }

  try {
    const recent = await count(
      `SELECT count() AS n FROM system.query_log
       WHERE type = 'QueryFinish' AND query_kind = 'Insert'
         AND has(tables, concat(currentDatabase(), '.', {table:String}))
         AND event_time > now() - INTERVAL ${LIVE_WRITE_WINDOW_SECONDS} SECOND
         AND query NOT LIKE '%${COPY_SUFFIX}%'`
    );
    if (recent > 0) evidence.push(`${recent} inserts into ${table} in the last ${LIVE_WRITE_WINDOW_SECONDS}s`);
  } catch {
    // query_log is removed in the shipped docker-compose.
  }

  return evidence;
}

export type TableOutcome = "skipped" | "planned" | "repaired" | "refused";

export async function repairTable(table: UtcTimeTable, opts: RepairOptions, log = console.log): Promise<TableOutcome> {
  const { columns, derived } = UTC_TIME_TABLES[table] as (typeof UTC_TIME_TABLES)[UtcTimeTable] & { derived?: boolean };
  const partitionColumn = columns.find(column => column.partitionKey);
  if (!partitionColumn) return "skipped";

  const engine = await tableEngine(table);
  if (!engine) {
    log(`\n${table}: not present, skipping`);
    return "skipped";
  }
  if (derived) {
    log(`\n${table}: regenerated by its refreshable materialized view on the next refresh, nothing to repair`);
    return "skipped";
  }

  const copy = `${table}${COPY_SUFFIX}`;
  const backup = `${table}${BACKUP_SUFFIX}`;

  // Never drop a leftover copy: after an interrupted run it is either a
  // partial copy or, if the swap went through but the rename did not, the
  // original data (in which case the live table already looks clean). Only
  // the operator can tell which, so this comes before every other check.
  if (await tableEngine(copy)) {
    log(
      `\n${table}: ${copy} is left over from an interrupted run. If ${table} now has 0 misplaced rows the swap completed: ` +
        `RENAME TABLE ${copy} TO ${backup}. Otherwise it is a partial copy: DROP TABLE ${copy}. Then rerun.`
    );
    return "refused";
  }

  const misplaced = await countMisplacedPartitionRows(table, partitionColumn.name);
  log(`\n${table}: ${misplaced} rows in a partition named under the old timezone`);
  if (misplaced === 0) {
    log("  nothing to do");
    return "skipped";
  }
  const statements = [
    `CREATE TABLE ${copy} AS ${table}`,
    `INSERT INTO ${copy} SELECT * FROM ${table}`,
    `EXCHANGE TABLES ${table} AND ${copy}`,
    `RENAME TABLE ${copy} TO ${backup}`,
  ];

  if (!opts.apply) {
    for (const statement of statements) log(`  ${statement}`);
    return "planned";
  }
  if (!opts.backendStopped) {
    log("  stop the backend, then pass --backend-stopped");
    return "refused";
  }

  if (await tableEngine(backup)) {
    if (!opts.dropBackups) {
      log(`  ${backup} exists from an earlier run; verify and DROP it, or pass --drop-backups`);
      return "refused";
    }
    await clickhouse.exec({ query: `DROP TABLE ${backup}` });
  }

  const evidence = await liveWriteEvidence(table);
  if (evidence.length > 0) {
    log(`  writers still active: ${evidence.join("; ")}. Stop them and rerun.`);
    return "refused";
  }

  for (const statement of statements.slice(0, 2)) {
    log(`  ${statement}`);
    await clickhouse.exec({ query: statement });
  }

  const [before, after] = await Promise.all([comparableRowCount(table, engine), comparableRowCount(copy, engine)]);
  if (before !== after) {
    log(
      `  ${copy} has ${after} rows but ${table} has ${before}; not swapping. Investigate, DROP TABLE ${copy}, and rerun with writers stopped`
    );
    return "refused";
  }

  for (const statement of statements.slice(2)) {
    log(`  ${statement}`);
    await clickhouse.exec({ query: statement });
  }

  const remaining = await countMisplacedPartitionRows(table, partitionColumn.name);
  log(`  swapped in; ${remaining} misplaced rows remain; original kept as ${backup}`);
  return "repaired";
}

export async function runRepair(argv: string[], log = console.log) {
  const opts = parseArgs(argv);
  const timezone = await getServerTimezone();
  log(`ClickHouse server timezone: ${timezone}${opts.apply ? "" : "  (dry run; pass --apply to execute)"}`);
  const outcomes: Partial<Record<TableOutcome, UtcTimeTable[]>> = {};
  for (const table of opts.tables) {
    const outcome = await repairTable(table, opts, log);
    (outcomes[outcome] ??= []).push(table);
  }
  if (outcomes.repaired?.length) {
    log(`\nRepaired: ${outcomes.repaired.join(", ")}. Verify, then DROP TABLE the ${BACKUP_SUFFIX} copies.`);
  }
  if (outcomes.refused?.length) {
    log(`\nRefused: ${outcomes.refused.join(", ")}`);
  }
  return outcomes;
}
