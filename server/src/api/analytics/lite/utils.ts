import { FilterParams } from "@rybbit/shared";
import { FilterType, TimeBucket } from "../types.js";
import { buildStringFilterCondition, wrapLikeValue } from "../utils/getFilterStatement.js";
import { validateFilters } from "../utils/query-validation.js";

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

// MVs are hour-bucketed, so anything below `hour` gets promoted.
export function liteBucket(bucket: TimeBucket | undefined): TimeBucket {
  if (!bucket) return "hour";
  if (bucket === "minute" || bucket === "five_minutes" || bucket === "ten_minutes" || bucket === "fifteen_minutes") {
    return "hour";
  }
  return bucket;
}

// The hourly rollups can't answer a sub-hour question: a 10:30 → 14:45 window
// would have to include the whole of hour 10 and hour 14, over-counting both
// edges. A datetime range therefore falls back to the raw-events endpoints, the
// same escape hatch an unsupported filter takes. Before, both the lite time
// statement and the lite fill simply ignored start_datetime/end_datetime, so the
// request came back as all-time data with a 200.
export function hasLiteDatetimeRange(
  params: Pick<FilterParams, "start_datetime" | "end_datetime">
): boolean {
  return Boolean(params.start_datetime && params.end_datetime);
}
