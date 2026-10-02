import { FastifyReply, FastifyRequest } from "fastify";
import { DateTime } from "luxon";
import { z } from "zod";
import { analyticsRoute, runAnalyticsQuery } from "./utils/analyticsQuery.js";
import { effectiveUserId } from "./utils/effectiveUserId.js";
import { buildFilteredSessionsCTE } from "./utils/sessionFilters.js";
import { getTimeStatement, isValidTimeZone, parseDateTimeMs } from "./utils/timeWindow.js";

/**
 * Cohort retention: users grouped by the period of their first visit, and the
 * share of each group that was active again 1, 2, 3… periods later.
 *
 * The cohort window is the request's time window (the dashboard's date range),
 * and returns are counted inside that same window, so a cohort's row ends where
 * the range ends. A user belongs to a cohort only if the window holds their
 * first visit: anyone seen in the {@link RETENTION_LOOKBACK_DAYS} days before
 * the window started is a returning visitor and is left out. The lookback is
 * bounded so the query is too; a visitor gone for longer than that counts as new.
 *
 * Filters pick users by their first visit (the session that put them in a
 * cohort). Returns count any later activity on the site.
 */

export type RetentionMode = "day" | "week";

/** How far before the window a visit makes someone a returning visitor rather than a new one. */
export const RETENTION_LOOKBACK_DAYS = 90;

/**
 * At most this many cohorts. A longer window keeps its latest periods: the
 * grid stays readable and the scan stays bounded (a year of weeks, a quarter
 * of days).
 */
export const MAX_COHORTS: Record<RetentionMode, number> = { day: 92, week: 53 };

// The `range` param predates the shared date range. It still answers API and
// MCP callers that send no window.
const LEGACY_RANGE_DEFAULT_DAYS = 90;
const LEGACY_RANGE_MIN_DAYS = 7;
const LEGACY_RANGE_MAX_DAYS = 365;

const optionalText = z.string().optional();

const retentionQuerySchema = z
  .object({
    mode: z.enum(["day", "week"]).default("week"),
    range: z.string().regex(/^\d+$/, { message: "range must be a whole number of days" }).optional().or(z.literal("")),
    start_date: optionalText,
    end_date: optionalText,
    start_datetime: optionalText,
    end_datetime: optionalText,
    past_minutes_start: z.union([z.string(), z.number()]).optional(),
    past_minutes_end: z.union([z.string(), z.number()]).optional(),
    time_zone: optionalText,
    filters: optionalText,
  })
  .refine(query => !query.start_date || !query.end_date || query.start_date <= query.end_date, {
    message: "start_date must not be after end_date",
  });

export type RetentionQuery = z.infer<typeof retentionQuerySchema>;

interface RetentionRow {
  cohort_period: string;
  period_difference: number;
  retained_users: number;
}

export interface RetentionCohort {
  /** New users in the cohort. */
  size: number;
  /**
   * Share of the cohort active in each period since their first, in percent
   * (index 0 is always 100). Null where the period falls after the window.
   */
  percentages: (number | null)[];
  /** The same, as user counts. */
  counts: (number | null)[];
}

export interface RetentionResponse {
  /** Keyed by the cohort period's first day (YYYY-MM-DD, in the window's timezone), oldest first. Empty cohorts are left out. */
  cohorts: Record<string, RetentionCohort>;
  /** Highest period offset in the grid: one less than the number of periods. */
  maxPeriods: number;
  mode: RetentionMode;
  /** Days spanned by the window. */
  range: number;
  /** Every cohort period in the window, oldest first, including empty ones. */
  periods: string[];
  /** The window as UTC instants: start inclusive, end exclusive. */
  windowStart: string;
  windowEnd: string;
  timeZone: string;
  /** The window starts after the first period begins, so that cohort only holds part of its period's new users. */
  firstPeriodPartial: boolean;
  /** The window ends before the last period does (it is in progress, or the range stops mid-period). */
  lastPeriodPartial: boolean;
  /** The last period is partial because it is still going on: the window ends now. */
  lastPeriodInProgress: boolean;
  /** The window held more than MAX_COHORTS periods and was cut to the latest ones. */
  truncated: boolean;
  lookbackDays: number;
}

export interface RetentionWindow {
  mode: RetentionMode;
  timeZone: string;
  start: DateTime;
  end: DateTime;
  periods: string[];
  firstPeriodPartial: boolean;
  lastPeriodPartial: boolean;
  /** The window runs up to now. */
  endsAtNow: boolean;
  truncated: boolean;
}

const unitFor = (mode: RetentionMode) => (mode === "week" ? "weeks" : "days");

/**
 * The cohort window a request asks for, as absolute instants, cut to whole
 * periods where it is too long and never reaching past now.
 *
 * Precedence matches the shared time window: a date range, then a datetime
 * range, then past minutes, then the legacy `range`, and all time when none is
 * given. The request's time params are validated before this runs.
 */
export function resolveRetentionWindow(
  query: Omit<RetentionQuery, "mode" | "filters">,
  mode: RetentionMode,
  nowMs: number = Date.now()
): RetentionWindow {
  const timeZone = query.time_zone && isValidTimeZone(query.time_zone) ? query.time_zone : "UTC";
  const now = DateTime.fromMillis(nowMs, { zone: timeZone });

  let start: DateTime;
  let end: DateTime;
  if (query.start_date && query.end_date) {
    start = DateTime.fromISO(query.start_date, { zone: timeZone }).startOf("day");
    end = DateTime.fromISO(query.end_date, { zone: timeZone }).plus({ days: 1 }).startOf("day");
  } else if (query.start_datetime && query.end_datetime) {
    start = DateTime.fromMillis(parseDateTimeMs(query.start_datetime), { zone: timeZone });
    end = DateTime.fromMillis(parseDateTimeMs(query.end_datetime), { zone: timeZone });
  } else if (
    query.past_minutes_start !== undefined &&
    query.past_minutes_start !== "" &&
    query.past_minutes_end !== undefined &&
    query.past_minutes_end !== ""
  ) {
    start = now.minus({ minutes: Number(query.past_minutes_start) });
    end = now.minus({ minutes: Number(query.past_minutes_end) });
  } else if (query.range) {
    const days = Math.min(LEGACY_RANGE_MAX_DAYS, Math.max(LEGACY_RANGE_MIN_DAYS, parseInt(query.range, 10)));
    start = now.startOf("day").minus({ days });
    end = now;
  } else if (query.start_date === "" && query.end_date === "") {
    // The dashboard's All time sends an empty date range. The cohort cap below
    // turns it into the latest periods.
    start = DateTime.fromMillis(0, { zone: timeZone });
    end = now;
  } else {
    // No window at all: the endpoint's documented default for API callers.
    start = now.startOf("day").minus({ days: LEGACY_RANGE_DEFAULT_DAYS });
    end = now;
  }

  // Nothing after now has happened yet; ending the window there is what lets
  // the last period read as in progress rather than as a drop.
  const endsAtNow = end >= now;
  if (endsAtNow) end = now;

  const unit = mode === "week" ? "week" : "day";
  if (!start.isValid || !end.isValid || start >= end) {
    return {
      mode,
      timeZone,
      start: end.isValid ? end : now,
      end: end.isValid ? end : now,
      periods: [],
      firstPeriodPartial: false,
      lastPeriodPartial: false,
      endsAtNow,
      truncated: false,
    };
  }

  // luxon's week starts on Monday, like toStartOfWeek(…, 1) in the query.
  const lastPeriodStart = end.minus({ milliseconds: 1 }).startOf(unit);
  const earliestStart = lastPeriodStart.minus({ [unitFor(mode)]: MAX_COHORTS[mode] - 1 });
  const truncated = start < earliestStart;
  if (truncated) start = earliestStart;

  const firstPeriodStart = start.startOf(unit);
  const periods: string[] = [];
  for (let period = firstPeriodStart; period <= lastPeriodStart; period = period.plus({ [unitFor(mode)]: 1 })) {
    periods.push(period.toISODate() ?? "");
  }

  return {
    mode,
    timeZone,
    start,
    end,
    periods,
    firstPeriodPartial: start > firstPeriodStart,
    lastPeriodPartial: lastPeriodStart.plus({ [unitFor(mode)]: 1 }) > end,
    endsAtNow,
    truncated,
  };
}

const toClickhouseInstant = (instant: DateTime) => instant.toUTC().toFormat("yyyy-MM-dd HH:mm:ss");

/** The cohort period an instant falls in, in the window's timezone. Monday-start weeks. */
const periodOf = (mode: RetentionMode, column: string) =>
  mode === "day" ? `toDate(${column}, {timeZone:String})` : `toStartOfWeek(${column}, 1, {timeZone:String})`;

/**
 * One pass over the window plus the lookback before it, grouped by user:
 * users with any earlier activity drop out, the rest are placed in the period
 * of their first visit, and each of their active periods becomes one
 * (cohort, offset) count. Bounded by the window cap, the fixed lookback and a
 * row limit of one triangle of cells.
 */
export function buildRetentionQuery(window: RetentionWindow, filters: string | undefined, siteId: number) {
  const lookbackStart = window.start.minus({ days: RETENTION_LOOKBACK_DAYS });
  const scanTimeStatement = getTimeStatement({
    start_datetime: toClickhouseInstant(lookbackStart),
    end_datetime: toClickhouseInstant(window.end),
    time_zone: window.timeZone,
  });
  const windowTimeStatement = getTimeStatement({
    start_datetime: toClickhouseInstant(window.start),
    end_datetime: toClickhouseInstant(window.end),
    time_zone: window.timeZone,
  });

  // Filters qualify the user's first session, so they select who is in a
  // cohort without narrowing what counts as coming back.
  const filteredSessionsCTE = buildFilteredSessionsCTE(filters, siteId, windowTimeStatement);
  const inWindow = "timestamp >= toDateTime({windowStart:String}, 'UTC')";
  const offset =
    window.mode === "day"
      ? "dateDiff('day', cohort_period, activity_period)"
      : "intDiv(dateDiff('day', cohort_period, activity_period), 7)";

  return `
WITH ${filteredSessionsCTE ? `${filteredSessionsCTE},` : ""}
Users AS (
    SELECT
        ${effectiveUserId()} AS effective_user_id,
        countIf(NOT (${inWindow})) AS earlier_events,
        minIf(timestamp, ${inWindow}) AS first_seen,
        argMinIf(session_id, timestamp, ${inWindow}) AS first_session_id,
        groupUniqArrayIf(${periodOf(window.mode, "timestamp")}, ${inWindow}) AS active_periods
    FROM events
    WHERE site_id = {siteId:UInt16}
    ${scanTimeStatement}
    GROUP BY effective_user_id
    HAVING earlier_events = 0
)
SELECT
    cohort_period,
    ${offset} AS period_difference,
    count() AS retained_users
FROM (
    SELECT
        ${periodOf(window.mode, "first_seen")} AS cohort_period,
        arrayJoin(active_periods) AS activity_period
    FROM Users
    ${filteredSessionsCTE ? "WHERE first_session_id IN (SELECT session_id FROM FilteredSessions)" : ""}
)
GROUP BY cohort_period, period_difference
ORDER BY cohort_period, period_difference
LIMIT {rowLimit:UInt32}
`;
}

export function buildRetentionQueryParams(window: RetentionWindow, siteId: number) {
  const cohorts = MAX_COHORTS[window.mode];
  return {
    siteId,
    timeZone: window.timeZone,
    windowStart: toClickhouseInstant(window.start),
    rowLimit: (cohorts * (cohorts + 1)) / 2,
  };
}

const roundPercent = (value: number) => Math.round(value * 100) / 100;

/**
 * Lays the (cohort, offset) counts out as a grid over the window's periods.
 * Inside the observable triangle a missing count means nobody came back (0);
 * past the window's end there is nothing to observe (null).
 */
export function processRetentionData(rows: RetentionRow[], periods: string[]): Record<string, RetentionCohort> {
  const periodCount = periods.length;
  const indexOf = new Map(periods.map((period, index) => [period, index]));
  const counts = new Map<string, (number | null)[]>();

  for (const row of rows) {
    const cohortIndex = indexOf.get(row.cohort_period);
    const offset = Number(row.period_difference);
    if (cohortIndex === undefined || offset < 0 || cohortIndex + offset >= periodCount) continue;

    let cohortCounts = counts.get(row.cohort_period);
    if (!cohortCounts) {
      cohortCounts = Array.from({ length: periodCount }, (_, p) => (cohortIndex + p < periodCount ? 0 : null));
      counts.set(row.cohort_period, cohortCounts);
    }
    cohortCounts[offset] = Number(row.retained_users);
  }

  const cohorts: Record<string, RetentionCohort> = {};
  for (const period of periods) {
    const cohortCounts = counts.get(period);
    const size = cohortCounts?.[0] ?? 0;
    if (!cohortCounts || size <= 0) continue;
    cohorts[period] = {
      size,
      counts: cohortCounts,
      percentages: cohortCounts.map(count => (count === null ? null : roundPercent((count / size) * 100))),
    };
  }
  return cohorts;
}

export function buildRetentionResponse(window: RetentionWindow, rows: RetentionRow[]): RetentionResponse {
  return {
    cohorts: processRetentionData(rows, window.periods),
    maxPeriods: Math.max(window.periods.length - 1, 0),
    mode: window.mode,
    range: Math.max(0, Math.round(window.end.diff(window.start, "days").days)),
    periods: window.periods,
    windowStart: window.start.toUTC().toISO() ?? "",
    windowEnd: window.end.toUTC().toISO() ?? "",
    timeZone: window.timeZone,
    firstPeriodPartial: window.firstPeriodPartial,
    lastPeriodPartial: window.lastPeriodPartial,
    lastPeriodInProgress: window.lastPeriodPartial && window.endsAtNow,
    truncated: window.truncated,
    lookbackDays: RETENTION_LOOKBACK_DAYS,
  };
}

interface GetRetentionRequest {
  Params: { siteId: string };
  Querystring: Record<string, unknown>;
}

export const getRetention = analyticsRoute<GetRetentionRequest>(
  "retention",
  async (req: FastifyRequest<GetRetentionRequest>, res: FastifyReply) => {
    const parsed = retentionQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).send({ error: parsed.error.issues.map(issue => issue.message).join("; ") });
    }

    const siteId = Number(req.params.siteId);
    const { mode, filters, ...windowParams } = parsed.data;
    const window = resolveRetentionWindow(windowParams, mode);

    const rows =
      window.periods.length === 0
        ? []
        : await runAnalyticsQuery<RetentionRow>({
            query: buildRetentionQuery(window, filters, siteId),
            params: buildRetentionQueryParams(window, siteId),
          });

    return res.send({ data: buildRetentionResponse(window, rows) });
  }
);
