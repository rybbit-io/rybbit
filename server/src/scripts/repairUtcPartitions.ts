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
// Each table is rebuilt through a row-for-row copy (CREATE TABLE ... AS,
// INSERT SELECT *, EXCHANGE TABLES): rows land in their UTC partition,
// materialized views do not fire on the copy, and the swap is atomic. The
// original is kept as <table>_utc_repair_backup until you drop it. It reads
// and rewrites every row, so STOP THE BACKEND FIRST and run it once, off-peak:
// a row inserted while the copy is taken would exist only in the backup.
//
// This script does not correct timestamps that a pre-fix backend mis-stored on
// a non-UTC server; that needs knowledge of when the old backend was writing,
// see docs: self-hosting-advanced → ClickHouse timezone.
//
// Usage (inside the backend image, with the backend stopped):
//   docker compose stop backend
//   docker compose run --rm --no-deps backend npm run repair:utc-partitions -- --apply --backend-stopped
//   docker compose start backend
//
// Options:
//   --apply                          Execute. Default is a dry run that only
//                                    reports counts and prints the SQL.
//   --backend-stopped                Required with --apply: you have stopped
//                                    every writer. The script additionally
//                                    refuses when it can see inserts running,
//                                    queued, or (where query_log exists) recent.
//   --tables events,bot_events,...   Subset of tables. Default: every known
//                                    table that exists.
//   --drop-backups                   Drop a <table>_utc_repair_backup left by
//                                    an earlier run instead of refusing.

import { runRepair } from "../db/clickhouse/utcPartitionRepair.js";

runRepair(process.argv.slice(2))
  .then(outcomes => process.exit(outcomes.refused?.length ? 1 : 0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
