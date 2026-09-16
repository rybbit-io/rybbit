// Rebuild ClickHouse tables whose month partitions were named under a non-UTC
// server timezone, so every row sits in the partition ClickHouse now prunes by.
//
// Background: every time column is declared DateTime('UTC') since the fix for
// issue #1205, and the startup migration converts existing columns in place
// (metadata only). On a server whose <timezone> is not UTC, rows within the old
// offset of a month boundary keep the partition computed in that timezone, and
// a query window that stays inside those boundary hours no longer sees them.
// Startup logs the affected tables; this script fixes them.
//
// Each table is rebuilt through a copy (CREATE TABLE ... AS, INSERT SELECT,
// EXCHANGE TABLES): rows land in their UTC partition, materialized views do not
// fire on the copy, and the swap is atomic. It reads and rewrites every row of
// the table, so run it once, off-peak.
//
// Optionally it also corrects instants that were mis-stored by a backend that
// wrote timezone-less strings to this server (rybbit-backend 2.9.0 and 2.9.1
// with a UTC backend, or any version where the backend TZ differed from the
// ClickHouse timezone): --reinterpret-from re-reads the stored wall-clock in
// that timezone as UTC for rows in [--since, --until). Decide the window from
// your own upgrade history; nothing here can infer it.
//
// Usage:
//   npm run repair:utc-partitions -- [options]
//
// Options:
//   --apply                          Execute. Default is a dry run that only
//                                    reports counts and prints the SQL.
//   --tables events,bot_events,...   Subset of tables. Default: every known
//                                    table that exists.
//   --reinterpret-from <tz>          Also re-read stored instants: a row's
//                                    wall-clock rendered in <tz> is taken as
//                                    UTC. Requires --since.
//   --since <YYYY-MM-DD HH:MM:SS>    UTC lower bound (inclusive) for
//                                    --reinterpret-from.
//   --until <YYYY-MM-DD HH:MM:SS>    UTC upper bound (exclusive). Default: now.

import { clickhouse } from "../db/clickhouse/clickhouse.js";
import { countMisplacedPartitionRows, getServerTimezone } from "../db/clickhouse/initUtils.js";
import { UTC_TIME_COLUMNS, type TimeColumnDefinition, type UtcTimeTable } from "../db/clickhouse/timeColumns.js";

const ALL_TABLES = Object.keys(UTC_TIME_COLUMNS) as UtcTimeTable[];
const DATETIME = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

type Options = {
  apply: boolean;
  tables: UtcTimeTable[];
  reinterpretFrom?: string;
  since?: string;
  until?: string;
};

function parseArgs(argv: string[]): Options {
  const opts: Options = { apply: false, tables: ALL_TABLES };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined) throw new Error(`${arg} needs a value`);
      return value;
    };
    if (arg === "--apply") opts.apply = true;
    else if (arg === "--tables") {
      opts.tables = next()
        .split(",")
        .map(name => name.trim())
        .filter(Boolean)
        .map(name => {
          if (!(name in UTC_TIME_COLUMNS)) throw new Error(`Unknown table ${name}; known: ${ALL_TABLES.join(", ")}`);
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
  return opts;
}

function sql(value: string) {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

async function tableExists(table: string) {
  const result = await clickhouse.query({
    query: "SELECT count() AS n FROM system.tables WHERE database = currentDatabase() AND name = {table:String}",
    query_params: { table },
    format: "JSONEachRow",
  });
  return Number((await result.json<{ n: string | number }>())[0]?.n ?? 0) > 0;
}

async function countRows(table: string) {
  const result = await clickhouse.query({ query: `SELECT count() AS n FROM ${table}`, format: "JSONEachRow" });
  return Number((await result.json<{ n: string | number }>())[0]?.n ?? 0);
}

/**
 * `SELECT * REPLACE (...)` that re-reads each time column's wall-clock, as
 * rendered in the old timezone, as UTC. DateTime64 keeps its precision through
 * toString; Nullable and SimpleAggregateFunction columns pass through the
 * functions unchanged in type.
 */
function reinterpretClause(columns: TimeColumnDefinition[], opts: Options) {
  if (!opts.reinterpretFrom) return "";
  const partition = columns.find(column => column.partitionKey) ?? columns[0];
  const inWindow = `${partition.name} >= toDateTime(${sql(opts.since!)}, 'UTC')${
    opts.until ? ` AND ${partition.name} < toDateTime(${sql(opts.until)}, 'UTC')` : ""
  }`;
  const replacements = columns.map(column => {
    const asUtc = column.type.includes("DateTime64")
      ? `toDateTime64(toString(toTimeZone(${column.name}, ${sql(opts.reinterpretFrom!)})), 3, 'UTC')`
      : `toDateTime(toString(toTimeZone(${column.name}, ${sql(opts.reinterpretFrom!)})), 'UTC')`;
    return `if(${inWindow}, ${asUtc}, ${column.name}) AS ${column.name}`;
  });
  return ` REPLACE (${replacements.join(", ")})`;
}

async function repairTable(table: UtcTimeTable, opts: Options) {
  const columns = UTC_TIME_COLUMNS[table];
  const partitionColumn = columns.find(column => column.partitionKey);
  if (!partitionColumn) return;

  if (!(await tableExists(table))) {
    console.log(`\n${table}: not present, skipping`);
    return;
  }

  const misplaced = await countMisplacedPartitionRows(table, partitionColumn.name);
  const total = await countRows(table);
  console.log(`\n${table}: ${total} rows, ${misplaced} in a partition named under the old timezone`);
  if (misplaced === 0 && !opts.reinterpretFrom) {
    console.log("  nothing to do");
    return;
  }

  const copy = `${table}_utc_repair`;
  const statements = [
    `DROP TABLE IF EXISTS ${copy}`,
    `CREATE TABLE ${copy} AS ${table}`,
    `INSERT INTO ${copy} SELECT *${reinterpretClause(columns, opts)} FROM ${table}`,
  ];

  if (!opts.apply) {
    for (const statement of statements) console.log(`  ${statement}`);
    console.log(`  EXCHANGE TABLES ${table} AND ${copy}`);
    console.log(`  DROP TABLE ${copy}`);
    return;
  }

  for (const statement of statements) {
    console.log(`  ${statement.split("\n")[0]}`);
    await clickhouse.exec({ query: statement });
  }

  const copied = await countRows(copy);
  if (copied !== total) {
    // Rows arrived while copying. Leave both tables for the operator rather
    // than swap in a copy that is missing them.
    console.error(
      `  copy has ${copied} rows but ${table} has ${total}; not swapping. Drop ${copy} and retry off-peak.`
    );
    process.exitCode = 1;
    return;
  }

  await clickhouse.exec({ query: `EXCHANGE TABLES ${table} AND ${copy}` });
  await clickhouse.exec({ query: `DROP TABLE ${copy}` });
  const remaining = await countMisplacedPartitionRows(table, partitionColumn.name);
  console.log(`  swapped in; ${remaining} misplaced rows remain`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const timezone = await getServerTimezone();
  console.log(`ClickHouse server timezone: ${timezone}${opts.apply ? "" : "  (dry run; pass --apply to execute)"}`);
  if (opts.reinterpretFrom) {
    console.log(`Re-reading instants in [${opts.since}, ${opts.until ?? "now"}) from ${opts.reinterpretFrom} as UTC`);
  }
  for (const table of opts.tables) {
    await repairTable(table, opts);
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
