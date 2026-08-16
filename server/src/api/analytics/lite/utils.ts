import { FilterType, TimeBucket } from "../types.js";
import { buildStringFilterCondition, wrapLikeValue } from "../utils/getFilterStatement.js";
import { validateFilters } from "../utils/query-validation.js";
import { TimeWindow } from "../utils/timeWindow.js";

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

// The session rollup can only serve simple string operators; anything else
// (regex, numeric comparisons, lat/lon) forces the raw-events fallback.
const LITE_SUPPORTED_FILTER_TYPES = new Set<FilterType>([
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "starts_with",
  "ends_with",
]);

// LIKE-value wrapping is shared with the events surface; re-exported under the
// historical lite name for existing importers and tests.
export const wrapLiteLikeValue = wrapLikeValue;

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

    if (filter.type === "is_null" || filter.type === "is_not_null") {
      conditions.push(buildStringFilterCondition(column, filter.type, filter.value));
      continue;
    }

    if (!LITE_SUPPORTED_FILTER_TYPES.has(filter.type) || filter.value.length === 0) {
      return { supported: false, sql: "" };
    }

    conditions.push(buildStringFilterCondition(column, filter.type, filter.value));
  }

  return { supported: true, sql: conditions.length ? `AND ${conditions.join(" AND ")}` : "" };
}

// The hourly rollups key on `toStartOfHour(timestamp)`, so a bound that falls
// inside an hour cannot be compared against them: `event_hour >= '10:30'` drops
// the entire 10:00 aggregate, losing 10:30–11:00, and `event_hour < '10:30'`
// keeps all of it, counting through 10:59. Only an explicit datetime range can
// ask for a bound mid-hour — date ranges land on day boundaries — so those fall
// back to the raw-events query, which is exact at any grain.
//
// Two approximations remain and are deliberate. A past-minutes window is an
// exact instant that will usually sit mid-hour, and a day boundary in a
// fractional-offset zone (IST, NPT) sits at :30 or :45. Both are the live
// dashboard's own hot path — the reads lite mode exists to keep off raw events
// — and both are at most one hour wide at the edges of the range.
export function liteWindowFitsHourlyMv(window: TimeWindow): boolean {
  if (window.kind !== "datetime") return true;
  const onTheHour = (datetime: string) => datetime.endsWith(":00:00");
  return onTheHour(window.startDatetime) && onTheHour(window.endDatetime);
}

// MVs are hour-bucketed, so anything below `hour` gets promoted.
export function liteBucket(bucket: TimeBucket | undefined): TimeBucket {
  if (!bucket) return "hour";
  if (bucket === "minute" || bucket === "five_minutes" || bucket === "ten_minutes" || bucket === "fifteen_minutes") {
    return "hour";
  }
  return bucket;
}
