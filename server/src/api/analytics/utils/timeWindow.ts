import { FilterParams, TimeBucket } from "@rybbit/shared";
import SqlString from "sqlstring";
import { validateTimeBucket, validateTimeStatementParams } from "./query-validation.js";

/**
 * A Time Window is the one answer to "which slice of time does this request
 * cover?". Every analytics surface asks it, and every surface needs two things
 * back: a WHERE predicate that bounds the scan, and — for bucketed series — a
 * WITH FILL clause that materialises the empty buckets.
 *
 * The six wire params are parsed once, here, into a resolved window; the
 * predicate and the fill are then rendered from that same value. That is what
 * keeps them consistent: a past-minutes window resolves `now()` at parse time,
 * so the predicate and the fill of a single query cannot straddle a clock tick,
 * and a query that interpolates the predicate several times gets the same
 * bounds each time.
 *
 * The predicate takes the column as a parameter. Callers that read a
 * materialized view (`event_hour`, `session_hour`) or the replay metadata table
 * (`start_time`) name their column instead of rewriting generated SQL with a
 * regex.
 */

// Time bucket mapping constants
export const TimeBucketToFn = {
  minute: "toStartOfMinute",
  five_minutes: "toStartOfFiveMinutes",
  ten_minutes: "toStartOfTenMinutes",
  fifteen_minutes: "toStartOfFifteenMinutes",
  hour: "toStartOfHour",
  day: "toStartOfDay",
  week: "toStartOfWeek",
  month: "toStartOfMonth",
  year: "toStartOfYear",
} as const;

export const bucketIntervalMap = {
  minute: "1 MINUTE",
  five_minutes: "5 MINUTES",
  ten_minutes: "10 MINUTES",
  fifteen_minutes: "15 MINUTES",
  hour: "1 HOUR",
  day: "1 DAY",
  week: "7 DAY",
  month: "1 MONTH",
  year: "1 YEAR",
} as const;

// WITH FILL's TO bound is exclusive, so the bucket containing the end of the
// window is only emitted if TO sits strictly inside the *next* bucket. Nudging
// the truncated end by one unit of the bucket's own grain does that without
// emitting a further bucket beyond it.
const bucketBoundaryUnit = {
  minute: "MINUTE",
  five_minutes: "MINUTE",
  ten_minutes: "MINUTE",
  fifteen_minutes: "MINUTE",
  hour: "HOUR",
  day: "DAY",
  week: "WEEK",
  month: "MONTH",
  year: "YEAR",
} as const;

// Format as YYYY-MM-DD HH:MM:SS (UTC) without milliseconds for ClickHouse.
const toClickhouseDateTime = (epochMs: number) => new Date(epochMs).toISOString().slice(0, 19).replace("T", " ");

export const normalizeDatetimeForClickhouse = (value: string) => {
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const withZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(normalized) ? normalized : `${normalized}Z`;
  return new Date(withZone).toISOString().slice(0, 19).replace("T", " ");
};

/**
 * Every field is optional: a date range, a datetime range and a past-minutes
 * window are three alternative ways to say the same thing, and callers outside
 * HTTP (the report jobs) supply only one of them. No time params at all is a
 * legitimate all-time query.
 */
export type TimeWindowParams = Partial<
  Pick<
    FilterParams,
    | "start_date"
    | "end_date"
    | "time_zone"
    | "start_datetime"
    | "end_datetime"
    | "past_minutes_start"
    | "past_minutes_end"
  >
>;

export type TimeWindow =
  | { kind: "all_time" }
  | { kind: "date"; startDate: string; endDate: string; timeZone: string }
  | { kind: "datetime"; startDatetime: string; endDatetime: string; timeZone: string }
  | { kind: "past_minutes"; startIso: string; endIso: string; timeZone: string };

const ALL_TIME: TimeWindow = { kind: "all_time" };

/**
 * Parse the six wire params into a resolved window. Precedence is date range,
 * then datetime range, then past-minutes — the order the surfaces have always
 * used. Params that are present but invalid degrade to all-time rather than
 * throwing; `validateHttpTimeParams` rejects those at the route so they never
 * reach here over HTTP.
 */
export function parseTimeWindow(params: TimeWindowParams): TimeWindow {
  const { start_date, end_date, time_zone, start_datetime, end_datetime, past_minutes_start, past_minutes_end } =
    params;

  const pastMinutesRange =
    past_minutes_start !== undefined && past_minutes_end !== undefined
      ? { start: Number(past_minutes_start), end: Number(past_minutes_end) }
      : undefined;

  // A missing time_zone must not silently discard the requested range (that
  // would return all-time data); the range is interpreted as UTC instead.
  const timeZone = time_zone || "UTC";
  const date = start_date && end_date ? { start_date, end_date, time_zone: timeZone } : undefined;
  const dateTimeRange = start_datetime && end_datetime ? { start_datetime, end_datetime } : undefined;

  const sanitized = validateTimeStatementParams({ date, dateTimeRange, pastMinutesRange });

  if (sanitized.date?.start_date && sanitized.date.end_date) {
    return {
      kind: "date",
      startDate: sanitized.date.start_date,
      endDate: sanitized.date.end_date,
      timeZone: sanitized.date.time_zone,
    };
  }

  if (sanitized.dateTimeRange) {
    return {
      kind: "datetime",
      startDatetime: normalizeDatetimeForClickhouse(sanitized.dateTimeRange.start_datetime),
      endDatetime: normalizeDatetimeForClickhouse(sanitized.dateTimeRange.end_datetime),
      timeZone,
    };
  }

  // Resolve past minutes to absolute timestamps once: ClickHouse never
  // re-evaluates now() mid-query, and the predicate and the fill of one query
  // must agree on where the window starts.
  if (sanitized.pastMinutesRange) {
    const { start, end } = sanitized.pastMinutesRange;
    const now = Date.now();
    return {
      kind: "past_minutes",
      startIso: toClickhouseDateTime(now - start * 60 * 1000),
      endIso: toClickhouseDateTime(now - end * 60 * 1000),
      timeZone,
    };
  }

  return ALL_TIME;
}

/**
 * The window as a WHERE-clause fragment, prefixed " AND " so it can be dropped
 * into a predicate list. An all-time window contributes nothing.
 *
 * @param column the DateTime column to bound — `timestamp` on `events`,
 *   `event_hour`/`session_hour` on the hourly materialized views, `start_time`
 *   on session metadata.
 */
export function timeWindowWhere(window: TimeWindow, column: string = "timestamp"): string {
  switch (window.kind) {
    case "date": {
      const { startDate, endDate, timeZone } = window;
      const tz = SqlString.escape(timeZone);
      return `AND ${column} >= toTimeZone(
      toStartOfDay(toDateTime(${SqlString.escape(startDate)}, ${tz})),
      'UTC'
      )
      AND ${column} < if(
        toDate(${SqlString.escape(endDate)}) = toDate(now(), ${tz}),
        toTimeZone(now(), 'UTC'),
        toTimeZone(
          toStartOfDay(toDateTime(${SqlString.escape(endDate)}, ${tz})) + INTERVAL 1 DAY,
          'UTC'
        )
      )`;
    }
    case "datetime":
      return `AND ${column} >= toDateTime(${SqlString.escape(window.startDatetime)}, 'UTC')
      AND ${column} < toDateTime(${SqlString.escape(window.endDatetime)}, 'UTC')`;
    // The bounds are absolute instants, so the window's time zone plays no part
    // here — it only decides where the *buckets* get cut, in the fill below.
    case "past_minutes":
      return `AND ${column} > toDateTime(${SqlString.escape(window.startIso)}, 'UTC') AND ${column} <= toDateTime(${SqlString.escape(window.endIso)}, 'UTC')`;
    case "all_time":
      return "";
  }
}

/**
 * The window as a WITH FILL clause for a bucketed series, to be appended after
 * `ORDER BY <bucket column>`. An all-time window has no bounds to fill between,
 * so it contributes nothing — the series is then whatever the data contains.
 *
 * The bounds are truncated with the same bucket function the SELECT groups by,
 * so every generated point lands on a real bucket boundary.
 */
export function timeWindowFill(window: TimeWindow, bucket: TimeBucket): string {
  const validatedBucket = validateTimeBucket(bucket);
  const fn = TimeBucketToFn[validatedBucket];
  const step = bucketIntervalMap[validatedBucket];

  switch (window.kind) {
    case "date": {
      const { startDate, endDate, timeZone } = window;
      const tz = SqlString.escape(timeZone);
      return `WITH FILL FROM toTimeZone(
      toDateTime(${fn}(toDateTime(${SqlString.escape(startDate)}, ${tz}))),
      'UTC'
      )
      TO if(
        toDate(${SqlString.escape(endDate)}) = toDate(now(), ${tz}),
        toTimeZone(now(), 'UTC'),
        toTimeZone(
          toDateTime(${fn}(toDateTime(${SqlString.escape(endDate)}, ${tz}))) + INTERVAL 1 DAY,
          'UTC'
        )
      ) STEP INTERVAL ${step}`;
    }
    case "datetime": {
      const { startDatetime, endDatetime, timeZone } = window;
      const tz = SqlString.escape(timeZone);
      return `WITH FILL FROM toTimeZone(
      toDateTime(${fn}(toTimeZone(toDateTime(${SqlString.escape(startDatetime)}, 'UTC'), ${tz}))),
      'UTC'
      )
      TO toTimeZone(
        toDateTime(${fn}(toTimeZone(toDateTime(${SqlString.escape(endDatetime)}, 'UTC'), ${tz}))),
        'UTC'
      ) STEP INTERVAL ${step}`;
    }
    // Truncated in the window's zone, like the date and datetime branches: the
    // SELECT cuts its buckets with `fn(toTimeZone(timestamp, tz))`, so bounds
    // cut in UTC would land between them and emit a second, offset row for
    // every real one at day-or-larger buckets in any non-UTC zone.
    //
    // toStartOfWeek/Month/Year return Date, not DateTime, so the bounds are
    // lifted back to DateTime to match the bucket column — WITH FILL rejects a
    // Date bound on a DateTime order key outright.
    case "past_minutes": {
      const tz = SqlString.escape(window.timeZone);
      return `WITH FILL
      FROM toTimeZone(
        toDateTime(${fn}(toTimeZone(toDateTime(${SqlString.escape(window.startIso)}, 'UTC'), ${tz}))),
        'UTC'
      )
      TO toTimeZone(
        toDateTime(${fn}(toTimeZone(toDateTime(${SqlString.escape(window.endIso)}, 'UTC'), ${tz}))),
        'UTC'
      ) + INTERVAL 1 ${bucketBoundaryUnit[validatedBucket]}
      STEP INTERVAL ${step}`;
    }
    case "all_time":
      return "";
  }
}

/**
 * Parse and render the predicate in one step, for the many callers that need
 * nothing else from the window. Callers that also fill, or that bound more than
 * one column, should hold the parsed window instead.
 */
export function getTimeStatement(params: TimeWindowParams, column: string = "timestamp"): string {
  return timeWindowWhere(parseTimeWindow(params), column);
}
