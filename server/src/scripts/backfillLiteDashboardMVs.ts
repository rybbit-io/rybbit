// Backfill the lite-dashboard materialized view targets from the existing
// `events` table. Materialized views only see new inserts, so after enabling
// LITE_DASHBOARD on a deployment that already has data, run this once.
//
// Usage:
//   tsc && node dist/scripts/backfillLiteDashboardMVs.js [options]
//
// Options:
//   --cutoff <YYYY-MM-DD HH:MM:SS>   Only backfill events strictly before this
//                                    timestamp. Default: now() minus 1 minute.
//                                    The MV captures rows >= cutoff live, so
//                                    pick a value at/just-before the moment
//                                    LITE_DASHBOARD was first enabled.
//   --from   <YYYY-MM-DD>            Lower bound (inclusive). Default: no bound.
//   --truncate                       TRUNCATE target tables first. Required if
//                                    re-running — AggregatingMergeTree is not
//                                    idempotent on re-insert.
//   --tables sessions,overview,...   Subset to backfill. Default: all targets.
//   --dry-run                        Print SQL without executing.

import { clickhouse } from "../db/clickhouse/clickhouse.js";

type TableKey = "sessions" | "overview" | "pathname" | "country" | "device_type";

const ALL_TABLES: TableKey[] = ["sessions", "overview", "pathname", "country", "device_type"];

const TARGET_TABLES: Record<TableKey, string> = {
  sessions: "sessions_mv_target",
  overview: "overview_hourly_mv_target",
  pathname: "pathname_hourly_mv_target",
  country: "country_hourly_mv_target",
  device_type: "device_type_hourly_mv_target",
};

// Each SELECT mirrors the MV definition in clickhouse.ts. Keep in sync.
function buildSelectQuery(table: TableKey, where: string): string {
  switch (table) {
    case "sessions":
      return `
        SELECT
          site_id,
          session_id,
          any(user_id) AS user_id,
          min(timestamp) AS start_time,
          max(timestamp) AS end_time,
          countIf(type = 'pageview') AS pageviews,
          count() AS events,
          any(country) AS country,
          any(region) AS region,
          any(device_type) AS device_type,
          any(browser) AS browser,
          any(operating_system) AS operating_system,
          any(hostname) AS hostname,
          max(timestamp) AS last_seen
        FROM events
        ${where}
        GROUP BY site_id, session_id
      `;
    case "overview":
      return `
        SELECT
          site_id,
          toStartOfHour(timestamp) AS event_hour,
          countIf(type = 'pageview') AS pageviews,
          count() AS events,
          uniqState(user_id) AS users,
          uniqState(session_id) AS sessions
        FROM events
        ${where}
        GROUP BY site_id, event_hour
      `;
    case "pathname":
      return `
        SELECT
          site_id,
          toStartOfHour(timestamp) AS event_hour,
          pathname,
          any(hostname) AS hostname,
          countIf(type = 'pageview') AS pageviews,
          uniqState(user_id) AS users,
          uniqState(session_id) AS sessions
        FROM events
        ${where} ${where ? "AND" : "WHERE"} type = 'pageview'
        GROUP BY site_id, event_hour, pathname
      `;
    case "country":
      return `
        SELECT
          site_id,
          toStartOfHour(timestamp) AS event_hour,
          country,
          region,
          countIf(type = 'pageview') AS pageviews,
          uniqState(user_id) AS users,
          uniqState(session_id) AS sessions
        FROM events
        ${where}
        GROUP BY site_id, event_hour, country, region
      `;
    case "device_type":
      return `
        SELECT
          site_id,
          toStartOfHour(timestamp) AS event_hour,
          device_type,
          countIf(type = 'pageview') AS pageviews,
          uniqState(user_id) AS users,
          uniqState(session_id) AS sessions
        FROM events
        ${where}
        GROUP BY site_id, event_hour, device_type
      `;
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  let cutoff: string | undefined;
  let from: string | undefined;
  let truncate = false;
  let dryRun = false;
  let tables: TableKey[] = ALL_TABLES;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--cutoff") cutoff = args[++i];
    else if (a === "--from") from = args[++i];
    else if (a === "--truncate") truncate = true;
    else if (a === "--dry-run") dryRun = true;
    else if (a === "--tables") {
      const list = args[++i]?.split(",").map(s => s.trim()) ?? [];
      const invalid = list.filter(t => !ALL_TABLES.includes(t as TableKey));
      if (invalid.length) throw new Error(`Unknown table(s): ${invalid.join(", ")}`);
      tables = list as TableKey[];
    } else if (a === "--help" || a === "-h") {
      console.log(
        "Usage: node dist/scripts/backfillLiteDashboardMVs.js [--cutoff '<ts>'] [--from <date>] [--truncate] [--tables a,b] [--dry-run]"
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown arg: ${a}`);
    }
  }

  return { cutoff, from, truncate, dryRun, tables };
}

// Iterate month-by-month so we never load >1 month of events into a single
// aggregation. Without this, ClickHouse can OOM on very large `events` tables.
async function* monthRanges(
  from: Date,
  to: Date
): AsyncGenerator<{ start: string; end: string; label: string }> {
  let cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  while (cursor < to) {
    const next = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    const start = cursor < from ? from : cursor;
    const end = next > to ? to : next;
    yield {
      start: start.toISOString().slice(0, 19).replace("T", " "),
      end: end.toISOString().slice(0, 19).replace("T", " "),
      label: cursor.toISOString().slice(0, 7),
    };
    cursor = next;
  }
}

async function getEventsRange(): Promise<{ minTs: Date | null; maxTs: Date | null }> {
  const result = await clickhouse.query({
    query: "SELECT min(timestamp) AS min_ts, max(timestamp) AS max_ts FROM events",
    format: "JSONEachRow",
  });
  const rows = (await result.json()) as Array<{ min_ts: string; max_ts: string }>;
  const row = rows[0];
  if (!row || !row.min_ts || row.min_ts === "1970-01-01 00:00:00") return { minTs: null, maxTs: null };
  return {
    minTs: new Date(row.min_ts.replace(" ", "T") + "Z"),
    maxTs: new Date(row.max_ts.replace(" ", "T") + "Z"),
  };
}

async function main() {
  const opts = parseArgs();

  const cutoff = opts.cutoff
    ? new Date(opts.cutoff.replace(" ", "T") + "Z")
    : new Date(Date.now() - 60 * 1000);

  const eventsRange = await getEventsRange();
  if (!eventsRange.minTs || !eventsRange.maxTs) {
    console.log("events table is empty — nothing to backfill.");
    return;
  }

  const from = opts.from
    ? new Date(opts.from + "T00:00:00Z")
    : eventsRange.minTs;
  const to = cutoff < eventsRange.maxTs ? cutoff : eventsRange.maxTs;

  console.log(`Backfilling tables: ${opts.tables.join(", ")}`);
  console.log(`Range: ${from.toISOString()} → ${to.toISOString()}`);
  console.log(`Mode: ${opts.dryRun ? "DRY-RUN" : opts.truncate ? "TRUNCATE+INSERT" : "INSERT"}`);

  if (opts.truncate && !opts.dryRun) {
    for (const table of opts.tables) {
      const target = TARGET_TABLES[table];
      console.log(`\nTRUNCATE ${target}`);
      await clickhouse.exec({ query: `TRUNCATE TABLE ${target}` });
    }
  }

  for (const table of opts.tables) {
    const target = TARGET_TABLES[table];
    console.log(`\n=== ${table} → ${target} ===`);

    for await (const month of monthRanges(from, to)) {
      const where = `WHERE timestamp >= toDateTime('${month.start}') AND timestamp < toDateTime('${month.end}')`;
      const select = buildSelectQuery(table, where);
      const insertSql = `INSERT INTO ${target}\n${select}`;

      const t0 = Date.now();
      if (opts.dryRun) {
        console.log(`-- ${month.label}`);
        console.log(insertSql.trim());
      } else {
        process.stdout.write(`  ${month.label}... `);
        await clickhouse.exec({ query: insertSql });
        console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s`);
      }
    }
  }

  console.log("\nDone. Run OPTIMIZE TABLE ... FINAL on each target if you want immediate part merging.");
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
