import { TimeBucket } from "@rybbit/shared";
import { DateTime, type DurationLike } from "luxon";
import { Comparison, ComparisonMode, Time } from "../components/DateSelector/types";
import { getDashboardTimeForRange } from "./defaultTimeRange";

// The Time module: every derivation over a `Time` value lives here — previous
// period, bucket selection, forward/back navigation, timezone recalculation,
// and URL (de)serialization. Pure: the user's zone and "now" are passed in, so
// everything is unit-testable. The store and URL-sync hook are thin callers.

export type RangeWithTimes = Extract<Time, { mode: "range" }> & { startTime: string; endTime: string };

export const hasRangeTimes = (time: Time): time is RangeWithTimes =>
  time.mode === "range" && typeof time.startTime === "string" && typeof time.endTime === "string";

export const getRangeDateTimeBounds = (time: RangeWithTimes, zone: string) => ({
  start: DateTime.fromISO(`${time.startDate}T${time.startTime}`, { zone }),
  end: DateTime.fromISO(`${time.endDate}T${time.endTime}`, { zone }),
});

export const toRangeWithTimes = (start: DateTime, end: DateTime): RangeWithTimes => ({
  mode: "range",
  startDate: start.toISODate() ?? "",
  startTime: start.toFormat("HH:mm:ss"),
  endDate: end.toISODate() ?? "",
  endTime: end.toFormat("HH:mm:ss"),
});

/**
 * The absolute instants a Time covers, with an **exclusive** end — the one
 * shape every mode can be compared in. `null` for all-time, which has no
 * bounds to resolve.
 *
 * The date picker needs this to seed a calendar and a pair of date/time fields
 * from whatever mode the dashboard is currently in, and to describe the
 * comparison window it is about to apply.
 */
export const getAbsoluteBounds = (time: Time, zone: string): { start: DateTime; end: DateTime } | null => {
  const startOfDay = (iso: string) => DateTime.fromISO(iso, { zone }).startOf("day");

  switch (time.mode) {
    case "all-time":
      return null;
    case "day":
      return { start: startOfDay(time.day), end: startOfDay(time.day).plus({ days: 1 }) };
    case "week":
      return { start: startOfDay(time.week), end: startOfDay(time.week).plus({ weeks: 1 }) };
    case "month":
      return { start: startOfDay(time.month), end: startOfDay(time.month).plus({ months: 1 }) };
    case "year":
      return { start: startOfDay(time.year), end: startOfDay(time.year).plus({ years: 1 }) };
    case "past-minutes": {
      const now = DateTime.now().setZone(zone);
      return {
        start: now.minus({ minutes: time.pastMinutesStart }),
        end: now.minus({ minutes: time.pastMinutesEnd }),
      };
    }
    case "range":
      return hasRangeTimes(time)
        ? getRangeDateTimeBounds(time, zone)
        : { start: startOfDay(time.startDate), end: startOfDay(time.endDate).plus({ days: 1 }) };
  }
};

export const getBucketForDateTimeRange = (start: DateTime, end: DateTime): TimeBucket => {
  const minutes = end.diff(start, "minutes").minutes;

  if (minutes <= 120) return "minute";
  if (minutes <= 1440) return "five_minutes";
  if (minutes <= 14 * 1440) return "hour";
  if (minutes <= 60 * 1440) return "day";
  if (minutes <= 180 * 1440) return "week";
  return "month";
};

/**
 * The default bucket for a Time: fine enough to show shape, coarse enough that
 * a year does not arrive as 365 points.
 */
export const getBucketForTime = (time: Time, zone: string): TimeBucket => {
  switch (time.mode) {
    case "day":
      return "hour";
    case "past-minutes":
      return time.pastMinutesStart - time.pastMinutesEnd <= 120 ? "minute" : "hour";
    case "week":
    case "month":
    case "all-time":
      return "day";
    case "year":
      return "month";
    case "range": {
      if (hasRangeTimes(time)) {
        const { start, end } = getRangeDateTimeBounds(time, zone);
        return getBucketForDateTimeRange(start, end);
      }

      const timeRangeLength = DateTime.fromISO(time.endDate).diff(DateTime.fromISO(time.startDate), "days").days + 1;
      if (timeRangeLength > 180) return "month";
      if (timeRangeLength > 31) return "week";
      return "day";
    }
  }
};

/**
 * The period immediately before this one — the single implementation of
 * "previous period" math (day-1, shifted ranges, doubled past-minutes windows,
 * week/month/year steps).
 */
export const getPreviousPeriod = (time: Time, zone: string): Time => {
  switch (time.mode) {
    case "day":
      return { mode: "day", day: DateTime.fromISO(time.day).minus({ days: 1 }).toISODate() ?? "" };
    case "past-minutes": {
      const timeDiff = time.pastMinutesStart - time.pastMinutesEnd;
      return {
        mode: "past-minutes",
        pastMinutesStart: time.pastMinutesStart + timeDiff,
        pastMinutesEnd: time.pastMinutesEnd + timeDiff,
      };
    }
    case "week":
      return { mode: "week", week: DateTime.fromISO(time.week).minus({ weeks: 1 }).toISODate() ?? "" };
    case "month":
      return { mode: "month", month: DateTime.fromISO(time.month).minus({ months: 1 }).toISODate() ?? "" };
    case "year":
      return { mode: "year", year: DateTime.fromISO(time.year).minus({ years: 1 }).toISODate() ?? "" };
    case "all-time":
      return { mode: "all-time" };
    case "range": {
      if (hasRangeTimes(time)) {
        const { start, end } = getRangeDateTimeBounds(time, zone);
        const duration = end.diff(start);
        return toRangeWithTimes(start.minus(duration), end.minus(duration));
      }

      const timeRangeLength = DateTime.fromISO(time.endDate).diff(DateTime.fromISO(time.startDate), "days").days + 1;
      return {
        mode: "range",
        startDate: DateTime.fromISO(time.startDate).minus({ days: timeRangeLength }).toISODate() ?? "",
        endDate: DateTime.fromISO(time.startDate).minus({ days: 1 }).toISODate() ?? "",
      };
    }
  }
};

/** The comparison period and default bucket for a Time. */
export const deriveTimeState = (time: Time, zone: string): { previousTime: Time; bucket: TimeBucket } => ({
  previousTime: getPreviousPeriod(time, zone),
  bucket: getBucketForTime(time, zone),
});

/**
 * How far back "matching weekdays" steps: the whole number of weeks closest to
 * the period's own length, so a Saturday is read against a Saturday. A 30-day
 * window lands 4 weeks back and overlaps its own first two days — the price of
 * keeping the weekly shape aligned, and the reason this is not the default.
 */
const weekdayShiftWeeks = (start: DateTime, end: DateTime): number =>
  Math.max(1, Math.round(end.diff(start, "days").days / 7));

/**
 * Steps a period back by `duration`, keeping the calendar-native modes native
 * so the comparison keeps the label and the bucketing of the period it mirrors.
 * Anything else becomes an explicit range. Null for all-time, which has no
 * bounds to step.
 */
const shiftPeriod = (time: Time, zone: string, duration: DurationLike): Time | null => {
  const bounds = getAbsoluteBounds(time, zone);
  if (!bounds) return null;

  if (time.mode === "day") {
    return { mode: "day", day: DateTime.fromISO(time.day).minus(duration).toISODate() ?? "" };
  }
  if (time.mode === "month") {
    return { mode: "month", month: DateTime.fromISO(time.month).minus(duration).toISODate() ?? "" };
  }
  if (time.mode === "year") {
    return { mode: "year", year: DateTime.fromISO(time.year).minus(duration).toISODate() ?? "" };
  }

  return toRangeWithTimes(bounds.start.minus(duration), bounds.end.minus(duration));
};

/**
 * What the dashboard compares against. Everything but `custom` is derived from
 * the selected period, so stepping the date selector carries the comparison
 * with it; `none` resolves to null and no comparison is fetched at all.
 *
 * A mode that cannot be expressed for the selected period — weekday alignment
 * across whole months, last year against a rolling past-minutes window — falls
 * back to the previous period rather than to nothing, so the dashboard never
 * silently loses its second line.
 */
export const resolveComparison = (time: Time, comparison: Comparison, zone: string): Time | null => {
  switch (comparison.mode) {
    case "none":
      return null;
    case "custom":
      return comparison.customTime ?? getPreviousPeriod(time, zone);
    case "weekday": {
      if (time.mode !== "day" && time.mode !== "week" && time.mode !== "range") break;
      const bounds = getAbsoluteBounds(time, zone);
      if (!bounds) break;
      return (
        shiftPeriod(time, zone, { weeks: weekdayShiftWeeks(bounds.start, bounds.end) }) ?? getPreviousPeriod(time, zone)
      );
    }
    case "year": {
      if (time.mode === "past-minutes" || time.mode === "all-time") break;
      return shiftPeriod(time, zone, { years: 1 }) ?? getPreviousPeriod(time, zone);
    }
    case "previous":
      break;
  }

  return getPreviousPeriod(time, zone);
};

/** The comparison modes that mean something for the selected period. */
export const availableComparisonModes = (time: Time): ComparisonMode[] => {
  if (time.mode === "all-time") return ["previous", "custom", "none"];
  if (time.mode === "past-minutes") return ["previous", "none"];
  if (time.mode === "month" || time.mode === "year") return ["previous", "year", "custom", "none"];
  return ["previous", "weekday", "year", "custom", "none"];
};

/**
 * A past-minutes window steps by its own length and stays relative to now, so
 * the presets keep auto-refreshing: {30, 0} back is {60, 30}, and forward from
 * there clamps the newer edge at 0 to land back on the live window.
 */
const shiftPastMinutes = (time: Extract<Time, { mode: "past-minutes" }>, direction: 1 | -1): Time | null => {
  const windowLength = time.pastMinutesStart - time.pastMinutesEnd;

  if (direction === -1) {
    return {
      mode: "past-minutes",
      pastMinutesStart: time.pastMinutesStart + windowLength,
      pastMinutesEnd: time.pastMinutesEnd + windowLength,
    };
  }

  if (time.pastMinutesEnd === 0) return null;
  const pastMinutesEnd = Math.max(0, time.pastMinutesEnd - windowLength);
  return { mode: "past-minutes", pastMinutesStart: pastMinutesEnd + windowLength, pastMinutesEnd };
};

/** One step back in time. Null when the mode doesn't navigate (all-time). */
export const shiftTimeBackward = (time: Time, zone: string): Time | null => {
  if (time.mode === "past-minutes") {
    return shiftPastMinutes(time, -1);
  }

  if (time.mode === "day") {
    return {
      mode: "day",
      day: DateTime.fromISO(time.day).minus({ days: 1 }).toISODate() ?? "",
    };
  }

  if (time.mode === "range") {
    if (hasRangeTimes(time)) {
      const { start, end } = getRangeDateTimeBounds(time, zone);
      const duration = end.diff(start);
      return toRangeWithTimes(start.minus(duration), end.minus(duration));
    }

    const startDate = DateTime.fromISO(time.startDate);
    const endDate = DateTime.fromISO(time.endDate);

    const daysBetweenStartAndEnd = endDate.diff(startDate, "days").days;
    if (daysBetweenStartAndEnd === 0) {
      const previousDate = startDate.minus({ days: 1 }).toISODate() ?? "";
      return { mode: "range", startDate: previousDate, endDate: previousDate };
    }

    return {
      mode: "range",
      startDate: startDate.minus({ days: daysBetweenStartAndEnd }).toISODate() ?? "",
      endDate: startDate.toISODate() ?? "",
    };
  }

  if (time.mode === "week") {
    return {
      mode: "week",
      week: DateTime.fromISO(time.week).minus({ weeks: 1 }).toISODate() ?? "",
    };
  }

  if (time.mode === "month") {
    return {
      mode: "month",
      month: DateTime.fromISO(time.month).minus({ months: 1 }).toISODate() ?? "",
    };
  }

  if (time.mode === "year") {
    return {
      mode: "year",
      year: DateTime.fromISO(time.year).minus({ years: 1 }).toISODate() ?? "",
    };
  }

  return null;
};

/**
 * One step forward in time. Null when the mode doesn't navigate or the step
 * would land entirely in the future (ranges clamp against `now`).
 */
export const shiftTimeForward = (time: Time, zone: string, now: DateTime = DateTime.now()): Time | null => {
  if (time.mode === "past-minutes") {
    return shiftPastMinutes(time, 1);
  }

  if (time.mode === "day") {
    return {
      mode: "day",
      day: DateTime.fromISO(time.day).plus({ days: 1 }).toISODate() ?? "",
    };
  }

  if (time.mode === "range") {
    if (hasRangeTimes(time)) {
      const { start, end } = getRangeDateTimeBounds(time, zone);
      const duration = end.diff(start);
      const proposedStart = start.plus(duration);
      const proposedEnd = end.plus(duration);
      const zonedNow = now.setZone(zone);

      if (proposedStart > zonedNow) {
        return null;
      }

      return toRangeWithTimes(proposedStart, proposedEnd > zonedNow ? zonedNow : proposedEnd);
    }

    // Parsed in `zone` for the same reason as canGoForward: both are compared against `now`
    // below, so a system-zone parse shifts the future-edge check by the offset.
    const startDate = DateTime.fromISO(time.startDate, { zone });
    const endDate = DateTime.fromISO(time.endDate, { zone });

    const daysBetweenStartAndEnd = endDate.diff(startDate, "days").days;
    if (daysBetweenStartAndEnd === 0) {
      const proposedDate = startDate.plus({ days: 1 });
      if (proposedDate > now) {
        return null;
      }

      const nextDate = proposedDate.toISODate() ?? "";
      return { mode: "range", startDate: nextDate, endDate: nextDate };
    }

    // Don't allow moving forward if it would put the entire range in the future
    if (startDate.plus({ days: daysBetweenStartAndEnd }) > now) {
      return null;
    }

    return {
      mode: "range",
      startDate: startDate.plus({ days: daysBetweenStartAndEnd }).toISODate() ?? "",
      endDate: endDate.plus({ days: daysBetweenStartAndEnd }).toISODate() ?? "",
    };
  }

  if (time.mode === "week") {
    return {
      mode: "week",
      week: DateTime.fromISO(time.week).plus({ weeks: 1 }).toISODate() ?? "",
    };
  }

  if (time.mode === "month") {
    return {
      mode: "month",
      month: DateTime.fromISO(time.month).plus({ months: 1 }).toISODate() ?? "",
    };
  }

  if (time.mode === "year") {
    return {
      mode: "year",
      year: DateTime.fromISO(time.year).plus({ years: 1 }).toISODate() ?? "",
    };
  }

  return null;
};

export const canGoForward = (time: Time, zone: string, now: DateTime = DateTime.now()): boolean => {
  // Both sides of every comparison below must be resolved in `zone`: the stored dates are
  // bare `yyyy-MM-dd` strings with no offset, and callers pass the *site's* timezone while
  // `now` defaults to the browser's. Parsing either side in the system zone silently offsets
  // the comparison and enables the forward arrow on today for anyone east of the site.
  const currentDay = now.setZone(zone).startOf("day");

  if (time.mode === "day") {
    return !(DateTime.fromISO(time.day, { zone }).startOf("day") >= currentDay);
  }

  if (time.mode === "range") {
    if (hasRangeTimes(time)) {
      return !(getRangeDateTimeBounds(time, zone).end >= now.setZone(zone));
    }

    return !(DateTime.fromISO(time.endDate, { zone }).startOf("day") >= currentDay);
  }

  if (time.mode === "week") {
    return !(DateTime.fromISO(time.week, { zone }).startOf("week") >= currentDay);
  }

  if (time.mode === "month") {
    return !(DateTime.fromISO(time.month, { zone }).startOf("month") >= currentDay);
  }

  if (time.mode === "year") {
    return !(DateTime.fromISO(time.year, { zone }).startOf("year") >= currentDay);
  }

  // A past-minutes window that already ends at now has nowhere newer to go.
  if (time.mode === "past-minutes") {
    return time.pastMinutesEnd > 0;
  }

  return false;
};

/**
 * Re-anchor a preset ("today", "last-7-days", ...) to a new timezone. Null when
 * the Time has no preset or is relative to now (past-minutes) — nothing to do.
 */
export const recalculateTimeForTimezone = (time: Time, zone: string): Time | null => {
  if (!time.wellKnown) return null;
  // past-minutes presets are relative to "now"; no date recalculation needed.
  if (time.mode === "past-minutes") return null;

  return getDashboardTimeForRange(time.wellKnown, zone);
};

// ---------------------------------------------------------------------------
// URL (de)serialization — the single definition of how a Time appears in the
// query string. All time-related fields are always present (null = cleared) so
// stale params from a previous mode never survive a mode switch.

export interface TimeUrlParams {
  timeMode: string | null;
  wellKnown: string | null;
  day: string | null;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  week: string | null;
  month: string | null;
  year: string | null;
  past_minutes_start: number | null;
  past_minutes_end: number | null;
}

export const timeToUrlParams = (time: Time): TimeUrlParams => {
  const params: TimeUrlParams = {
    timeMode: time.mode,
    wellKnown: null,
    day: null,
    startDate: null,
    endDate: null,
    startTime: null,
    endTime: null,
    week: null,
    month: null,
    year: null,
    past_minutes_start: null,
    past_minutes_end: null,
  };

  // A preset is stored alone; explicit date fields only appear without one.
  if (time.wellKnown) {
    params.wellKnown = time.wellKnown;
    return params;
  }

  if (time.mode === "day") {
    params.day = time.day;
  } else if (time.mode === "range") {
    params.startDate = time.startDate;
    params.endDate = time.endDate;
    params.startTime = time.startTime ?? null;
    params.endTime = time.endTime ?? null;
  } else if (time.mode === "week") {
    params.week = time.week;
  } else if (time.mode === "month") {
    params.month = time.month;
  } else if (time.mode === "year") {
    params.year = time.year;
  } else if (time.mode === "past-minutes") {
    params.past_minutes_start = time.pastMinutesStart;
    params.past_minutes_end = time.pastMinutesEnd;
  }

  return params;
};

/** Null when the params don't describe a complete Time (caller falls back to the default). */
export const urlParamsToTime = (params: Partial<TimeUrlParams>, zone: string): Time | null => {
  if (params.wellKnown) {
    return getDashboardTimeForRange(params.wellKnown, zone);
  }

  if (!params.timeMode) return null;

  if (params.timeMode === "day" && params.day) {
    return { mode: "day", day: params.day };
  }
  if (params.timeMode === "range" && params.startDate && params.endDate) {
    return params.startTime && params.endTime
      ? {
          mode: "range",
          startDate: params.startDate,
          endDate: params.endDate,
          startTime: params.startTime,
          endTime: params.endTime,
        }
      : { mode: "range", startDate: params.startDate, endDate: params.endDate };
  }
  if (params.timeMode === "week" && params.week) {
    return { mode: "week", week: params.week };
  }
  if (params.timeMode === "month" && params.month) {
    return { mode: "month", month: params.month };
  }
  if (params.timeMode === "year" && params.year) {
    return { mode: "year", year: params.year };
  }
  if (params.timeMode === "past-minutes" && params.past_minutes_start != null && params.past_minutes_end != null) {
    return {
      mode: "past-minutes",
      pastMinutesStart: params.past_minutes_start,
      pastMinutesEnd: params.past_minutes_end,
    };
  }
  if (params.timeMode === "all-time") {
    return { mode: "all-time" };
  }

  return null;
};

export interface ComparisonUrlParams {
  compare: string | null;
  compareStart: string | null;
  compareEnd: string | null;
}

const COMPARISON_MODES: ComparisonMode[] = ["previous", "weekday", "year", "custom", "none"];

/**
 * The comparison travels in the URL alongside the period. Without it a link to
 * "vs last year" opens for the next person as "vs last month" — the same
 * numbers under a different question.
 *
 * The default needs no param, so existing links keep working and the common
 * case leaves the query string as short as it is today.
 */
export const comparisonToUrlParams = (comparison: Comparison): ComparisonUrlParams => {
  if (comparison.mode === "previous") {
    return { compare: null, compareStart: null, compareEnd: null };
  }

  if (comparison.mode === "custom" && comparison.customTime?.mode === "range") {
    return {
      compare: "custom",
      compareStart: comparison.customTime.startDate,
      compareEnd: comparison.customTime.endDate,
    };
  }

  return { compare: comparison.mode, compareStart: null, compareEnd: null };
};

/** Null when the params don't name a comparison (caller keeps the default). */
export const urlParamsToComparison = (params: Partial<ComparisonUrlParams>): Comparison | null => {
  const mode = COMPARISON_MODES.find(candidate => candidate === params.compare);
  if (!mode) return null;

  if (mode === "custom") {
    if (!params.compareStart || !params.compareEnd) return null;
    return {
      mode: "custom",
      customTime: { mode: "range", startDate: params.compareStart, endDate: params.compareEnd },
    };
  }

  return { mode };
};
