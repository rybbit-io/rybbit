import { FilterParams } from "@rybbit/shared";
import SqlString from "sqlstring";
import { TimeBucket } from "../types.js";
import { TimeBucketToFn, bucketIntervalMap } from "../utils/utils.js";
import { validateFilters, validateTimeStatementParams } from "../utils/query-validation.js";

// Lite endpoints back the simplified high-traffic dashboard. They read from
// hourly materialized views (overview_hourly_mv, sessions_mv, pathname_hourly_mv,
// country_hourly_mv, device_type_hourly_mv) instead of raw events. Sub-hour
// buckets are promoted to hour because the MVs are hour-grained.
//
// Filters are served three ways, fastest first:
//   1. No filter            → the per-dimension hourly rollups (smallest reads).
//   2. Session-column filter → sessions_mv_target, one row per session. Every
//      dimension the session rollup carries (country, device_type, browser, …)
//      can be filtered here without touching raw events.
//   3. Anything else         → fall back to the raw `events` query (standard
//      endpoints). pathname/page_title/utm/etc. aren't on the session rollup.

// True when the request carries at least one valid filter.
export function hasLiteFilters(filters: string | undefined): boolean {
  if (!filters) return false;
  return validateFilters(filters).length > 0;
}

// Dimension columns carried by sessions_mv_target, keyed by filter parameter.
// A filter on any of these can be answered from the session rollup; a filter on
// anything else forces the raw-events fallback.
//
// Only session-INVARIANT attributes belong here. sessions_mv writes one partial
// row per insert block per session and the read queries re-aggregate by
// session_id, so a WHERE filter on these columns is correct only when every
// partial row of a session shares the value (device, geo, hostname — true for
// the whole session). Entry/acquisition attributes (entry_page, referrer,
// channel) are first-event values that differ across a session's events, so a
// per-partial-row filter would match some rows and drop others, undercounting.
// Those deliberately fall back to the raw-events query, which derives them with
// the same argMin/first-value semantics as the standard endpoints.
const LITE_SESSION_FILTER_COLUMNS: Record<string, string> = {
  country: "country",
  region: "region",
  device_type: "device_type",
  browser: "browser",
  operating_system: "operating_system",
  hostname: "hostname",
};

const LITE_FILTER_OPERATORS: Record<string, string> = {
  equals: "=",
  not_equals: "!=",
  contains: "LIKE",
  not_contains: "NOT LIKE",
  starts_with: "LIKE",
  ends_with: "LIKE",
};

function wrapLiteLikeValue(type: string, value: string | number): string {
  const v = String(value);
  if (type === "contains" || type === "not_contains") return `%${v}%`;
  if (type === "starts_with") return `${v}%`;
  if (type === "ends_with") return `%${v}`;
  return v;
}

// Build a WHERE-clause fragment (prefixed " AND ") against sessions_mv_target
// columns. Returns `supported: false` when any filter targets a column or type
// the session rollup can't serve, signalling the caller to fall back to events.
export function getLiteSessionFilter(filters: string | undefined): { supported: boolean; sql: string } {
  if (!filters) return { supported: true, sql: "" };

  const filtersArray = validateFilters(filters);
  if (filtersArray.length === 0) return { supported: true, sql: "" };

  const conditions: string[] = [];

  for (const filter of filtersArray) {
    const column = LITE_SESSION_FILTER_COLUMNS[filter.parameter];
    if (!column) return { supported: false, sql: "" };

    if (filter.type === "is_null") {
      conditions.push(`(${column} IS NULL OR ${column} = '')`);
      continue;
    }
    if (filter.type === "is_not_null") {
      conditions.push(`(${column} IS NOT NULL AND ${column} != '')`);
      continue;
    }

    const op = LITE_FILTER_OPERATORS[filter.type];
    if (!op || filter.value.length === 0) return { supported: false, sql: "" };

    const parts = filter.value.map(
      value => `${column} ${op} ${SqlString.escape(wrapLiteLikeValue(filter.type, value))}`
    );
    conditions.push(parts.length === 1 ? parts[0] : `(${parts.join(" OR ")})`);
  }

  return { supported: true, sql: conditions.length ? `AND ${conditions.join(" AND ")}` : "" };
}

export type LiteTimeRange = {
  startStatement: string;
  endStatement: string;
  whereClause: string;
};

// Build a WHERE-clause fragment that filters an MV's hour-bucket column.
// The `column` is whichever hour-truncated DateTime column the MV exposes
// (overview_hourly_mv uses `event_hour`; sessions_mv uses `start_time`).
export function getLiteTimeStatement(
  params: Pick<FilterParams, "start_date" | "end_date" | "time_zone" | "past_minutes_start" | "past_minutes_end">,
  column: string
): string {
  const { start_date, end_date, time_zone, past_minutes_start, past_minutes_end } = params;

  const pastMinutesRange =
    past_minutes_start !== undefined && past_minutes_end !== undefined
      ? { start: Number(past_minutes_start), end: Number(past_minutes_end) }
      : undefined;

  const date = start_date && end_date && time_zone ? { start_date, end_date, time_zone } : undefined;

  const sanitized = validateTimeStatementParams({ date, pastMinutesRange });

  if (sanitized.date) {
    const { start_date, end_date, time_zone } = sanitized.date;
    if (!start_date && !end_date) return "";

    return `AND ${column} >= toTimeZone(
      toStartOfDay(toDateTime(${SqlString.escape(start_date)}, ${SqlString.escape(time_zone)})),
      'UTC'
    )
    AND ${column} < if(
      toDate(${SqlString.escape(end_date)}) = toDate(now(), ${SqlString.escape(time_zone)}),
      toTimeZone(now(), 'UTC'),
      toTimeZone(
        toStartOfDay(toDateTime(${SqlString.escape(end_date)}, ${SqlString.escape(time_zone)})) + INTERVAL 1 DAY,
        'UTC'
      )
    )`;
  }

  if (sanitized.pastMinutesRange) {
    const { start, end } = sanitized.pastMinutesRange;
    const now = new Date();
    const startTimestamp = new Date(now.getTime() - start * 60 * 1000);
    const endTimestamp = new Date(now.getTime() - end * 60 * 1000);
    const startIso = startTimestamp.toISOString().slice(0, 19).replace("T", " ");
    const endIso = endTimestamp.toISOString().slice(0, 19).replace("T", " ");

    return `AND ${column} > toDateTime(${SqlString.escape(startIso)}) AND ${column} <= toDateTime(${SqlString.escape(endIso)})`;
  }

  return "";
}

// MVs are hour-bucketed, so anything below `hour` gets promoted.
export function liteBucket(bucket: TimeBucket | undefined): TimeBucket {
  if (!bucket) return "hour";
  if (bucket === "minute" || bucket === "five_minutes" || bucket === "ten_minutes" || bucket === "fifteen_minutes") {
    return "hour";
  }
  return bucket;
}

export function getLiteFillClause(
  params: FilterParams,
  bucket: TimeBucket
): string {
  const { start_date, end_date, time_zone, past_minutes_start, past_minutes_end } = params;
  const fn = TimeBucketToFn[bucket];
  const interval = bucketIntervalMap[bucket];

  if (start_date && end_date && time_zone) {
    return `WITH FILL FROM toTimeZone(
      toDateTime(${fn}(toDateTime(${SqlString.escape(start_date)}, ${SqlString.escape(time_zone)}))),
      'UTC'
    )
    TO if(
      toDate(${SqlString.escape(end_date)}) = toDate(now(), ${SqlString.escape(time_zone)}),
      toTimeZone(now(), 'UTC'),
      toTimeZone(
        toDateTime(${fn}(toDateTime(${SqlString.escape(end_date)}, ${SqlString.escape(time_zone)}))) + INTERVAL 1 DAY,
        'UTC'
      )
    ) STEP INTERVAL ${interval}`;
  }

  if (past_minutes_start !== undefined && past_minutes_end !== undefined) {
    const now = new Date();
    const startTs = new Date(now.getTime() - Number(past_minutes_start) * 60 * 1000);
    const endTs = new Date(now.getTime() - Number(past_minutes_end) * 60 * 1000);
    const startIso = startTs.toISOString().slice(0, 19).replace("T", " ");
    const endIso = endTs.toISOString().slice(0, 19).replace("T", " ");
    return `WITH FILL FROM ${fn}(toDateTime(${SqlString.escape(startIso)}))
      TO ${fn}(toDateTime(${SqlString.escape(endIso)})) + INTERVAL ${interval}
      STEP INTERVAL ${interval}`;
  }

  return "";
}
