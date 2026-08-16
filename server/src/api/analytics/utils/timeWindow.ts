import { FilterParams, TimeBucket } from "@rybbit/shared";
import SqlString from "sqlstring";
import { z } from "zod";

/**
 * The one answer to "what slice of time is this query about?".
 *
 * A request expresses its window one of three ways — a date range in the Site's
 * timezone, a range of absolute datetimes, or a trailing past-minutes window —
 * and every bucketed query needs two SQL fragments out of it: a `WHERE`
 * predicate and a `WITH FILL` clause that puts a zero row in every empty bucket.
 *
 * Those fragments used to be built by three `WHERE` builders and five `WITH
 * FILL` builders, hand-copied across the overview, error, performance, bot and
 * lite endpoints, with five separate "is this an all-time query?" predicates
 * deciding whether to emit a fill at all. They had drifted:
 *
 *   - the error fill ran `FROM now() - INTERVAL n MINUTE`, which is not aligned
 *     to a bucket boundary, so a realtime error chart got filled rows at
 *     :56:47 interleaved with real rows at :00:00
 *   - the error and performance fills interpolated `start_datetime` raw. The
 *     accepted format allows a `Z` or `+02:00` suffix, and ClickHouse's
 *     `toDateTime` rejects both — a datetime-range request 500'd
 *   - the error handler called its fill builder unconditionally and the builder
 *     threw on missing time params, so an all-time error time-series 500'd
 *   - the lite fill and the lite predicate ignored `start_datetime`/`end_datetime`
 *     entirely, silently answering a datetime request with all-time data
 *   - past-minutes fills bucketed in the server timezone while the surrounding
 *     `SELECT` bucketed in the Site's, so on a half-hour offset (`Asia/Kolkata`)
 *     the filled rows landed 30 minutes off the real ones
 *
 * Callers that need only the predicate keep using {@link getTimeStatement}.
 * Callers that need both resolve the window once with {@link resolveTimeWindow}
 * and ask it for each fragment, which is what makes the two agree by
 * construction: a fill can no longer be emitted for a window the `WHERE` clause
 * didn't bound, and `now()` for a past-minutes window is read once instead of
 * once per fragment.
 *
 * Resolution is total. Params that are missing, incomplete or malformed resolve
 * to the all-time window — the same forgiving behaviour `getTimeStatement` has
 * always had, and legitimate for the report jobs, which supply one mode and
 * leave the others undefined. Rejecting *malformed* params is the HTTP layer's
 * job: `validateHttpTimeParams` runs in front of every route that takes them.
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

/**
 * ClickHouse's `toDateTime(String)` parses `YYYY-MM-DD hh:mm:ss` and the `T`
 * variant, but throws on a trailing `Z` or `+02:00` — both of which the accepted
 * datetime format allows. Normalise to the instant's plain UTC rendering.
 */
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

/**
 * The accepted wire formats, exported so that the HTTP validator in
 * query-validation.ts accepts exactly what {@link normalizeDatetimeForClickhouse}
 * knows how to render. The `Z` / `+02:00` suffix drifted between the two once
 * already — accepted at the door, unparseable by ClickHouse downstream.
 */
export const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
export const dateTimeRegex = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:?\d{2})?$/;

export const parseDateTimeMs = (value: string) => {
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const withZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(normalized) ? normalized : `${normalized}Z`;
  return Date.parse(withZone);
};

export const isValidTimeZone = (tz: string) => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const dateSchema = z
  .string()
  .regex(dateRegex)
  .refine(date => !isNaN(Date.parse(date)));

const dateTimeSchema = z
  .string()
  .regex(dateTimeRegex)
  .refine(value => !isNaN(parseDateTimeMs(value)));

const minutesSchema = z
  .union([z.string(), z.number()])
  .transform(value => Number(value))
  .refine(value => !isNaN(value) && value >= 0);

const dateWindowSchema = z.object({ start_date: dateSchema, end_date: dateSchema });

const dateTimeWindowSchema = z
  .object({ start_datetime: dateTimeSchema, end_datetime: dateTimeSchema })
  .refine(data => parseDateTimeMs(data.start_datetime) < parseDateTimeMs(data.end_datetime));

// start is the older bound: "from 60 minutes ago to 0 minutes ago".
const pastMinutesWindowSchema = z
  .object({ start: minutesSchema, end: minutesSchema })
  .refine(data => data.start > data.end);

/**
 * A window that has been validated and reduced to one of four shapes. The
 * `date` shape stays symbolic because its bounds mean "midnight in `timeZone`",
 * which only ClickHouse can resolve; the instant shapes are already absolute.
 */
type ResolvedWindow =
  | { kind: "all" }
  | { kind: "date"; startDate: string; endDate: string; timeZone: string }
  | { kind: "datetime"; start: string; end: string; timeZone: string }
  | { kind: "pastMinutes"; start: string; end: string; timeZone: string };

/** Formats an instant the way ClickHouse's `toDateTime` wants it. */
const toClickhouseInstant = (date: Date) => date.toISOString().slice(0, 19).replace("T", " ");

function resolve(params: TimeWindowParams): ResolvedWindow {
  const timeZone = params.time_zone || "UTC";

  // An unusable timezone makes every window meaningless — a date range means
  // "midnight where the Site is", and the instant ranges still bucket in it — so
  // it degrades to all-time rather than silently reporting UTC days as local
  // ones. HTTP callers never get here: validateHttpTimeParams rejects it first.
  if (!isValidTimeZone(timeZone)) {
    return { kind: "all" };
  }

  if (params.start_date && params.end_date) {
    const parsed = dateWindowSchema.safeParse(params);
    if (parsed.success) {
      return { kind: "date", startDate: parsed.data.start_date, endDate: parsed.data.end_date, timeZone };
    }
  }

  if (params.start_datetime && params.end_datetime) {
    const parsed = dateTimeWindowSchema.safeParse(params);
    if (parsed.success) {
      return {
        kind: "datetime",
        start: normalizeDatetimeForClickhouse(parsed.data.start_datetime),
        end: normalizeDatetimeForClickhouse(parsed.data.end_datetime),
        timeZone,
      };
    }
  }

  if (params.past_minutes_start !== undefined && params.past_minutes_end !== undefined) {
    const parsed = pastMinutesWindowSchema.safeParse({
      start: params.past_minutes_start,
      end: params.past_minutes_end,
    });
    if (parsed.success) {
      // Resolved to absolute instants here, once, so the predicate and the fill
      // describe the same window: `now()` used to be read separately by each
      // builder — and four times over inside the overview query alone.
      const now = Date.now();
      return {
        kind: "pastMinutes",
        start: toClickhouseInstant(new Date(now - parsed.data.start * 60 * 1000)),
        end: toClickhouseInstant(new Date(now - parsed.data.end * 60 * 1000)),
        timeZone,
      };
    }
  }

  return { kind: "all" };
}

/** A resolved window, ready to render either SQL fragment. */
export interface TimeWindow {
  /**
   * True when the request named no usable window. Both fragments are empty:
   * the query spans the Site's whole history and there is nothing to fill
   * between.
   */
  readonly isAllTime: boolean;

  /**
   * The `WHERE` fragment bounding `column`, already prefixed with `AND`, or ""
   * for an all-time window.
   *
   * `column` is a parameter because the same window is applied to `timestamp`
   * on `events`, `start_time` on the replay tables and `event_hour` /
   * `session_hour` on the hourly rollups. Callers used to build the fragment for
   * `timestamp` and rewrite it downstream with a regex.
   */
  where(column?: string): string;

  /**
   * The expression to SELECT and GROUP BY when bucketing `column`, truncated to
   * `bucket` in the window's timezone.
   *
   * Pairs with {@link fill}: ClickHouse rejects a `WITH FILL` whose bounds are
   * not the same type as the column it is filling, and `toStartOfWeek`,
   * `toStartOfMonth` and `toStartOfYear` return `Date` where every other bucket
   * function returns `DateTime`. Every bucketed query but one already wrapped
   * the truncation in `toDateTime` to flatten that; the error time-series did
   * not, which is why no single fill builder could serve both. Emitting the
   * bucket expression from the same module as the fill is what makes the two
   * types agree by construction.
   */
  bucketed(column: string, bucket: TimeBucket): string;

  /**
   * The `WITH FILL FROM … TO … STEP …` clause for `bucket`, or "" for an
   * all-time window. Belongs directly after the `ORDER BY` of a query that
   * groups by {@link bucketed}; the bounds are bucket-aligned in the same
   * timezone so filled rows land on the real ones.
   */
  fill(bucket: TimeBucket): string;
}

/**
 * Truncates `expression` to `bucket` in `timeZone`, always as a `DateTime`.
 *
 * The `toDateTime` wrapper is what keeps a bucket column one type across bucket
 * sizes: `toStartOfWeek`/`Month`/`Year` return `Date`, the rest `DateTime`, and
 * a `WITH FILL` whose bounds differ in type from the column it fills is an
 * INVALID_WITH_FILL_EXPRESSION error, not a silently wrong result. Both the
 * SELECT expression and the fill bounds are built from here so they cannot
 * disagree.
 */
const truncate = (expression: string, bucket: TimeBucket, timeZone: string) =>
  `toDateTime(${TimeBucketToFn[bucket]}(toTimeZone(${expression}, ${SqlString.escape(timeZone)})))`;

/** Bucket-aligns an absolute instant, matching the SELECT's bucket expression. */
const alignInstant = (instant: string, bucket: TimeBucket, timeZone: string) =>
  truncate(`toDateTime(${SqlString.escape(instant)}, 'UTC')`, bucket, timeZone);

function whereClause(window: ResolvedWindow, column: string): string {
  switch (window.kind) {
    case "all":
      return "";

    case "date": {
      const { startDate, endDate, timeZone } = window;
      const tz = SqlString.escape(timeZone);
      // The upper bound is the end date's midnight *tomorrow*, except when the
      // end date is today — then it is now, so a partial final day is not
      // reported as a whole one.
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
      return `AND ${column} >= toDateTime(${SqlString.escape(window.start)}, 'UTC')
      AND ${column} < toDateTime(${SqlString.escape(window.end)}, 'UTC')`;

    case "pastMinutes":
      return `AND ${column} > toDateTime(${SqlString.escape(window.start)}, 'UTC') AND ${column} <= toDateTime(${SqlString.escape(window.end)}, 'UTC')`;
  }
}

function fillClause(window: ResolvedWindow, bucket: TimeBucket): string {
  if (window.kind === "all") {
    return "";
  }

  const step = bucketIntervalMap[bucket];

  if (window.kind === "date") {
    const { startDate, endDate, timeZone } = window;
    const tz = SqlString.escape(timeZone);
    // A date bound means midnight in `timeZone`, which only ClickHouse can
    // resolve, so the bound stays symbolic and gets truncated in SQL.
    const midnight = (date: string) => truncate(`toDateTime(${SqlString.escape(date)}, ${tz})`, bucket, timeZone);
    return `WITH FILL FROM toTimeZone(${midnight(startDate)}, 'UTC')
      TO if(
        toDate(${SqlString.escape(endDate)}) = toDate(now(), ${tz}),
        toTimeZone(now(), 'UTC'),
        toTimeZone(${midnight(endDate)} + INTERVAL 1 DAY, 'UTC')
      ) STEP INTERVAL ${step}`;
  }

  const from = alignInstant(window.start, bucket, window.timeZone);

  // `TO` is exclusive. A datetime range's upper bound is exclusive too, so the
  // bucket it lands on holds no rows and is not filled. A past-minutes window
  // ends at `now`, mid-bucket, so its final bucket does hold rows — one step
  // past the aligned end is what makes that bucket appear when it is empty.
  const to =
    window.kind === "datetime"
      ? alignInstant(window.end, bucket, window.timeZone)
      : `${alignInstant(window.end, bucket, window.timeZone)} + INTERVAL ${step}`;

  return `WITH FILL FROM ${from} TO ${to} STEP INTERVAL ${step}`;
}

/**
 * Validates the six time params once and returns the window they describe.
 *
 * Precedence is date range, then datetime range, then past minutes — the order
 * the endpoints have always applied. A mode whose params are incomplete or
 * malformed is skipped rather than failing the whole resolution.
 */
export function resolveTimeWindow(params: TimeWindowParams): TimeWindow {
  const window = resolve(params);
  // An all-time window still buckets — it just doesn't fill — so the display
  // timezone has to survive a window that resolved to no bounds.
  const timeZone = window.kind === "all" ? params.time_zone || "UTC" : window.timeZone;
  return {
    isAllTime: window.kind === "all",
    where: (column = "timestamp") => whereClause(window, column),
    bucketed: (column: string, bucket: TimeBucket) =>
      truncate(column, bucket, isValidTimeZone(timeZone) ? timeZone : "UTC"),
    fill: (bucket: TimeBucket) => fillClause(window, bucket),
  };
}

/**
 * The `WHERE` fragment alone, for the many callers that never fill. Equivalent
 * to `resolveTimeWindow(params).where(column)`.
 */
export function getTimeStatement(params: TimeWindowParams, column = "timestamp"): string {
  return resolveTimeWindow(params).where(column);
}
