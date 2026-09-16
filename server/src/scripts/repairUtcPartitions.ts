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
// fire on the copy, and the swap is atomic. The original is kept as
// <table>_utc_repair_backup until you drop it. It reads and rewrites every row,
// so STOP THE BACKEND FIRST and run it once, off-peak: a row inserted while the
// copy is taken would exist only in the backup.
//
// Optionally it also corrects instants that were mis-stored by a backend that
// wrote timezone-less strings to this server (rybbit-backend 2.9.0 and 2.9.1
// with a UTC backend, or any version where the backend TZ differed from the
// ClickHouse timezone): --reinterpret-from re-reads the stored wall-clock in
// that timezone as UTC for rows in [--since, --until). Only columns the old
// writer stored as naive strings are touched (see timeColumns.ts). Decide the
// window from your own upgrade history; nothing here can infer it. Completed
// windows are recorded in utc_repair_log so a re-run does not shift them twice.
//
// Usage (inside the backend image, with the backend stopped):
//   docker compose stop backend
//   docker compose run --rm --no-deps backend npm run repair:utc-partitions -- [options]
//   docker compose start backend
//
// Options:
//   --apply                          Execute. Default is a dry run that only
//                                    reports counts and prints the SQL.
//   --tables events,bot_events,...   Subset of tables. Default: every known
//                                    table that exists.
//   --reinterpret-from <tz>          Also re-read stored instants: a row's
//                                    wall-clock rendered in <tz> is taken as
//                                    UTC. Requires --since.
//   --since <YYYY-MM-DD HH:MM:SS>    UTC lower bound (inclusive).
//   --until <YYYY-MM-DD HH:MM:SS>    UTC upper bound (exclusive). Default: the
//                                    moment startup converted each table
//                                    (recorded in utc_repair_log), i.e. when
//                                    the fixed backend first ran.
//   --allow-live-writes              Proceed even if the query log shows
//                                    inserts in the last two minutes.
//   --drop-backups                   Drop a <table>_utc_repair_backup left by
//                                    an earlier run instead of refusing.

import { runRepair } from "../db/clickhouse/utcPartitionRepair.js";

runRepair(process.argv.slice(2))
  .then(outcomes => process.exit(outcomes.refused?.length ? 1 : 0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
