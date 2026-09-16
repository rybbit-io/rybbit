import { clickhouse } from "./client.js";
import { countMisplacedPartitionRows, getServerTimezone, recordUtcRepair, UTC_REPAIR_LOG_TABLE } from "./initUtils.js";
import { UTC_TIME_TABLES, type TimeColumnDefinition, type UtcTimeTable } from "./timeColumns.js";

/**
 * Rebuilds tables whose month partitions were named under a non-UTC server
 * timezone (see ensureUtcTimeColumns), optionally re-reading instants that a
 * pre-fix backend mis-stored on that server. Driven by scripts/repairUtcPartitions.ts.
 *
 * Each table is copied (CREATE TABLE ... AS, INSERT SELECT), the copy is
 * swapped in with EXCHANGE TABLES, and the original is kept as
 * `<table>_utc_repair_backup` until the operator drops it. Materialized views
 * do not fire on the copy and stay attached to the name after the swap.
 *
 * Writers must be stopped: a row inserted after the copy is taken lives only
 * in the backup. The script refuses to proceed when the query log shows
 * recent inserts unless told otherwise.
 */

export const ALL_TABLES = Object.keys(UTC_TIME_TABLES) as UtcTimeTable[];
export const LOG_TABLE = UTC_REPAIR_LOG_TABLE;
export const BACKUP_SUFFIX = "_utc_repair_backup";
const COPY_SUFFIX = "_utc_repair";
const DATETIME = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
const LIVE_WRITE_WINDOW_SECONDS = 120;

export type RepairOptions = {
  apply: boolean;
  tables: UtcTimeTable[];
  reinterpretFrom?: string;
  since?: string;
  /**
   * UTC, exclusive. When omitted each table defaults to the moment startup
   * converted it, recorded in the repair log: rows written after that came
   * from the fixed backend and must not be re-read.
   */
  until?: string;
  allowLiveWrites: boolean;
  dropBackups: boolean;
};

export function parseArgs(argv: string[]): RepairOptions {
  const opts: RepairOptions = { apply: false, tables: ALL_TABLES, allowLiveWrites: false, dropBackups: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined) throw new Error(`${arg} needs a value`);
      return value;
    };
    if (arg === "--apply") opts.apply = true;
    else if (arg === "--allow-live-writes") opts.allowLiveWrites = true;
    else if (arg === "--drop-backups") opts.dropBackups = true;
    else if (arg === "--tables") {
      opts.tables = next()
        .split(",")
        .map(name => name.trim())
        .filter(Boolean)
        .map(name => {
          if (!(name in UTC_TIME_TABLES)) throw new Error(`Unknown table ${name}; known: ${ALL_TABLES.join(", ")}`);
          return name as UtcTimeTable;
        });
    } else if (arg === "--reinterpret-from") opts.reinterpretFrom = next();
    else if (arg === "--since") opts.since = next();
    else if (arg === "--until") opts.until = next();
    else throw new Error(`Unknown argument ${arg}`);
  }
  if (opts.reinterpretFrom && !opts.since) throw new Error("--reinterpret-from requires --since");
  for (const bound of [opts.since, opts.until]) {
    if (bound !== undefined && !DATETIME.test(bound)) throw new Error(`Expected YYYY-MM-DD HH:MM:SS, got ${bound}`);
  }
  if (opts.since && opts.until && opts.since >= opts.until) {
    throw new Error(`--since ${opts.since} is not before --until ${opts.until}`);
  }
  return opts;
}

export type ReinterpretWindow = { zone: string; since: string; until: string };

export function sql(value: string) {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

/**
 * `SELECT * REPLACE (...)` re-reading each mis-stored column's wall-clock, as
 * rendered in the old timezone, as UTC for rows inside the window. Columns the
 * old writer stored correctly (no `naiveWriter`) are passed through. Bounds
 * are tested on the partition column so every column of a row moves together.
 */
export function reinterpretClause(columns: TimeColumnDefinition[], window: ReinterpretWindow | undefined) {
  if (!window) return "";
  const targets = columns.filter(column => column.naiveWriter);
  if (targets.length === 0) return "";
  const partition = columns.find(column => column.partitionKey) ?? columns[0];
  const inWindow =
    `${partition.name} >= toDateTime(${sql(window.since)}, 'UTC')` +
    ` AND ${partition.name} < toDateTime(${sql(window.until)}, 'UTC')`;
  const zone = sql(window.zone);
  const replacements = targets.map(column => {
    const asUtc = column.type.includes("DateTime64")
      ? `toDateTime64(toString(toTimeZone(${column.name}, ${zone})), 3, 'UTC')`
      : `toDateTime(toString(toTimeZone(${column.name}, ${zone})), 'UTC')`;
    return `if(${inWindow}, ${asUtc}, ${column.name}) AS ${column.name}`;
  });
  return ` REPLACE (${replacements.join(", ")})`;
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
 * sides, since the copy's parts may merge before we compare.
 */
async function comparableRowCount(table: string, engine: string) {
  const final = /(Aggregating|Summing|Replacing|Collapsing)MergeTree/.test(engine) ? " FINAL" : "";
  const row = await queryOne<{ n: string | number }>(`SELECT count() AS n FROM ${table}${final}`);
  return Number(row?.n ?? 0);
}

async function recentInsertCount(table: string) {
  try {
    const row = await queryOne<{ n: string | number }>(
      `SELECT count() AS n FROM system.query_log
       WHERE type = 'QueryFinish' AND query_kind = 'Insert'
         AND has(tables, concat(currentDatabase(), '.', {table:String}))
         AND event_time > now() - INTERVAL ${LIVE_WRITE_WINDOW_SECONDS} SECOND
         AND query NOT LIKE '%${COPY_SUFFIX}%'`,
      { table }
    );
    return Number(row?.n ?? 0);
  } catch {
    return undefined;
  }
}

/** When startup converted this table's partition column, from the repair log. */
async function migratedAt(table: string) {
  if (!(await tableEngine(LOG_TABLE))) return undefined;
  const row = await queryOne<{ at: string }>(
    `SELECT toString(min(completed_at)) AS at FROM ${LOG_TABLE} WHERE table = {table:String} AND kind = 'migrated'`,
    { table }
  );
  return row?.at && row.at !== "1970-01-01 00:00:00" ? row.at : undefined;
}

/** A completed re-read of this table whose window overlaps the requested one. */
async function overlappingReinterpretation(table: string, window: ReinterpretWindow) {
  if (!(await tableEngine(LOG_TABLE))) return undefined;
  return queryOne<{ since: string; until: string; completed_at: string }>(
    `SELECT since, until, toString(completed_at) AS completed_at FROM ${LOG_TABLE}
     WHERE table = {table:String} AND kind = 'repaired' AND reinterpret_from != ''
       AND since < {until:String} AND until > {since:String}
     ORDER BY completed_at DESC LIMIT 1`,
    { table, since: window.since, until: window.until }
  );
}

/** Resolves the table's re-read window, or a reason none can be applied. */
async function resolveWindow(
  table: string,
  opts: RepairOptions
): Promise<ReinterpretWindow | { refuse: string } | undefined> {
  if (!opts.reinterpretFrom) return undefined;
  const until = opts.until ?? (await migratedAt(table));
  if (!until) {
    return { refuse: `no startup migration recorded for ${table}; pass --until <moment the fixed backend first ran>` };
  }
  if (opts.since! >= until) return { refuse: `--since ${opts.since} is not before the window end ${until}` };
  return { zone: opts.reinterpretFrom, since: opts.since!, until };
}

export type TableOutcome = "skipped" | "planned" | "repaired" | "refused";

export async function repairTable(table: UtcTimeTable, opts: RepairOptions, log = console.log): Promise<TableOutcome> {
  const { columns, derived } = UTC_TIME_TABLES[table] as { columns: TimeColumnDefinition[]; derived?: boolean };
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

  const misplaced = await countMisplacedPartitionRows(table, partitionColumn.name);
  log(`\n${table}: ${misplaced} rows in a partition named under the old timezone`);

  const resolved = await resolveWindow(table, opts);
  if (resolved && "refuse" in resolved) {
    log(`  ${resolved.refuse}`);
    return "refused";
  }
  const window = resolved;
  const reinterpret = reinterpretClause(columns, window);
  if (misplaced === 0 && !reinterpret) {
    log("  nothing to do");
    return "skipped";
  }

  if (window) {
    const done = await overlappingReinterpretation(table, window);
    if (done) {
      log(
        `  already re-read [${done.since}, ${done.until}) at ${done.completed_at} UTC, which overlaps [${window.since}, ${window.until}); skipping so rows are not shifted twice`
      );
      return "skipped";
    }
    log(`  re-reading [${window.since}, ${window.until}) from ${window.zone} as UTC`);
  }

  const copy = `${table}${COPY_SUFFIX}`;
  const backup = `${table}${BACKUP_SUFFIX}`;
  const statements = [
    `DROP TABLE IF EXISTS ${copy}`,
    `CREATE TABLE ${copy} AS ${table}`,
    `INSERT INTO ${copy} SELECT *${reinterpret} FROM ${table}`,
    `EXCHANGE TABLES ${table} AND ${copy}`,
    `RENAME TABLE ${copy} TO ${backup}`,
  ];

  if (!opts.apply) {
    for (const statement of statements) log(`  ${statement}`);
    return "planned";
  }

  if (await tableEngine(backup)) {
    if (!opts.dropBackups) {
      log(`  ${backup} exists from an earlier run; verify and DROP it, or pass --drop-backups`);
      return "refused";
    }
    await clickhouse.exec({ query: `DROP TABLE ${backup}` });
  }

  const inserts = await recentInsertCount(table);
  if (inserts === undefined) {
    log(`  query log unavailable; cannot check for live writers, make sure the backend is stopped`);
  } else if (inserts > 0 && !opts.allowLiveWrites) {
    log(
      `  ${inserts} inserts in the last ${LIVE_WRITE_WINDOW_SECONDS}s; stop the backend first (or pass --allow-live-writes and reconcile from ${backup})`
    );
    return "refused";
  }

  for (const statement of statements.slice(0, 3)) {
    log(`  ${statement}`);
    await clickhouse.exec({ query: statement });
  }

  const [before, after] = await Promise.all([comparableRowCount(table, engine), comparableRowCount(copy, engine)]);
  if (before !== after) {
    log(
      `  ${copy} has ${after} rows but ${table} has ${before}; not swapping. Investigate, DROP ${copy}, and retry with writers stopped`
    );
    return "refused";
  }

  for (const statement of statements.slice(3)) {
    log(`  ${statement}`);
    await clickhouse.exec({ query: statement });
  }

  await recordUtcRepair({
    table,
    kind: "repaired",
    reinterpret_from: window?.zone,
    since: window?.since,
    until: window?.until,
  });

  const remaining = await countMisplacedPartitionRows(table, partitionColumn.name);
  log(`  swapped in; ${remaining} misplaced rows remain; original kept as ${backup}`);
  return "repaired";
}

export async function runRepair(argv: string[], log = console.log) {
  const opts = parseArgs(argv);
  const timezone = await getServerTimezone();
  log(`ClickHouse server timezone: ${timezone}${opts.apply ? "" : "  (dry run; pass --apply to execute)"}`);
  if (opts.reinterpretFrom) {
    log(
      `Re-reading mis-stored instants from ${opts.since} UTC until ${opts.until ?? "each table's startup migration"} from ${opts.reinterpretFrom} as UTC`
    );
  }
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
