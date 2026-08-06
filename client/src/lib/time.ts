import { TimeBucket } from "@rybbit/shared";
import { DateTime } from "luxon";
import { Time } from "../components/DateSelector/types";
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
 * The comparison period and default bucket for a Time. This is the single
 * implementation of "previous period" math (day-1, shifted ranges, doubled
 * past-minutes windows, week/month/year steps).
 */
export const deriveTimeState = (time: Time, zone: string): { previousTime: Time; bucket: TimeBucket } => {
  let bucket: TimeBucket = "hour";
  let previousTime: Time;

  if (time.mode === "day") {
    bucket = "hour";
    previousTime = {
      mode: "day",
      day: DateTime.fromISO(time.day).minus({ days: 1 }).toISODate() ?? "",
    };
  } else if (time.mode === "past-minutes") {
    const timeDiff = time.pastMinutesStart - time.pastMinutesEnd;

    if (timeDiff <= 120) {
      bucket = "minute";
    }

    previousTime = {
      mode: "past-minutes",
      pastMinutesStart: time.pastMinutesStart + timeDiff,
      pastMinutesEnd: time.pastMinutesEnd + timeDiff,
    };
  } else if (time.mode === "range") {
    if (hasRangeTimes(time)) {
      const { start, end } = getRangeDateTimeBounds(time, zone);
      const duration = end.diff(start);
      bucket = getBucketForDateTimeRange(start, end);

      previousTime = toRangeWithTimes(start.minus(duration), end.minus(duration));
    } else {
      const timeRangeLength = DateTime.fromISO(time.endDate).diff(DateTime.fromISO(time.startDate), "days").days + 1;

      if (timeRangeLength > 180) {
        bucket = "month";
      } else if (timeRangeLength > 31) {
        bucket = "week";
      } else {
        bucket = "day";
      }

      previousTime = {
        mode: "range",
        startDate: DateTime.fromISO(time.startDate).minus({ days: timeRangeLength }).toISODate() ?? "",
        endDate: DateTime.fromISO(time.startDate).minus({ days: 1 }).toISODate() ?? "",
      };
    }
  } else if (time.mode === "week") {
    bucket = "day";
    previousTime = {
      mode: "week",
      week: DateTime.fromISO(time.week).minus({ weeks: 1 }).toISODate() ?? "",
    };
  } else if (time.mode === "month") {
    bucket = "day";
    previousTime = {
      mode: "month",
      month: DateTime.fromISO(time.month).minus({ months: 1 }).toISODate() ?? "",
    };
  } else if (time.mode === "year") {
    bucket = "month";
    previousTime = {
      mode: "year",
      year: DateTime.fromISO(time.year).minus({ years: 1 }).toISODate() ?? "",
    };
  } else if (time.mode === "all-time") {
    bucket = "day";
    previousTime = { mode: "all-time" };
  } else {
    previousTime = time;
  }

  return { previousTime, bucket };
};

/** One step back in time. Null when the mode doesn't navigate (all-time, past-minutes). */
export const shiftTimeBackward = (time: Time, zone: string): Time | null => {
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

    const startDate = DateTime.fromISO(time.startDate);
    const endDate = DateTime.fromISO(time.endDate);

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
  const currentDay = now.startOf("day");

  if (time.mode === "day") {
    return !(DateTime.fromISO(time.day).startOf("day") >= currentDay);
  }

  if (time.mode === "range") {
    if (hasRangeTimes(time)) {
      return !(getRangeDateTimeBounds(time, zone).end >= now.setZone(zone));
    }

    return !(DateTime.fromISO(time.endDate).startOf("day") >= currentDay);
  }

  if (time.mode === "week") {
    return !(DateTime.fromISO(time.week).startOf("week") >= currentDay);
  }

  if (time.mode === "month") {
    return !(DateTime.fromISO(time.month).startOf("month") >= currentDay);
  }

  if (time.mode === "year") {
    return !(DateTime.fromISO(time.year).startOf("year") >= currentDay);
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
