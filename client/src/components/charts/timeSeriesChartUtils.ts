import type { TimeBucket } from "@rybbit/shared";
import { DateTime } from "luxon";

import type { Time } from "@/components/DateSelector/types";

const bucketUnit = (bucket: TimeBucket): { unit: "minutes" | "hours" | "days" | "weeks" | "months" | "years"; size: number } => {
  switch (bucket) {
    case "minute":
      return { unit: "minutes", size: 1 };
    case "five_minutes":
      return { unit: "minutes", size: 5 };
    case "ten_minutes":
      return { unit: "minutes", size: 10 };
    case "fifteen_minutes":
      return { unit: "minutes", size: 15 };
    case "hour":
      return { unit: "hours", size: 1 };
    case "day":
      return { unit: "days", size: 1 };
    case "week":
      return { unit: "weeks", size: 1 };
    case "month":
      return { unit: "months", size: 1 };
    case "year":
      return { unit: "years", size: 1 };
  }
};

/**
 * Moves `dt` by `n` whole buckets in calendar terms, so a month step lands on
 * the next month's start and a day step survives a DST change — neither of
 * which a millisecond offset does.
 */
export const shiftBuckets = (dt: DateTime, bucket: TimeBucket, n: number): DateTime => {
  const { unit, size } = bucketUnit(bucket);
  return dt.plus({ [unit]: n * size });
};

export const stepBucket = (dt: DateTime, bucket: TimeBucket, direction: 1 | -1): DateTime =>
  shiftBuckets(dt, bucket, direction);

/**
 * How many whole buckets separate two bucket-aligned instants. Rounded, so the
 * two week conventions (see `floorToWeekStart`) disagreeing by a day still
 * count the same number of weeks.
 */
export const bucketsBetween = (from: DateTime, to: DateTime, bucket: TimeBucket): number => {
  const { unit, size } = bucketUnit(bucket);
  return Math.round(to.diff(from, unit).get(unit) / size);
};

export const floorToBucket = (dt: DateTime, bucket: TimeBucket): DateTime => {
  switch (bucket) {
    case "minute":
      return dt.startOf("minute");
    case "five_minutes":
      return dt.set({
        minute: Math.floor(dt.minute / 5) * 5,
        second: 0,
        millisecond: 0,
      });
    case "ten_minutes":
      return dt.set({
        minute: Math.floor(dt.minute / 10) * 10,
        second: 0,
        millisecond: 0,
      });
    case "fifteen_minutes":
      return dt.set({
        minute: Math.floor(dt.minute / 15) * 15,
        second: 0,
        millisecond: 0,
      });
    case "hour":
      return dt.startOf("hour");
    case "day":
      return dt.startOf("day");
    case "week":
      return dt.startOf("week");
    case "month":
      return dt.startOf("month");
    case "year":
      return dt.startOf("year");
  }
};

export const floorToMinuteInterval = (dt: DateTime, minutes: number): DateTime =>
  dt.set({
    minute: Math.floor(dt.minute / minutes) * minutes,
    second: 0,
    millisecond: 0,
  });

export const bucketMinuteInterval = (bucket: TimeBucket): number | null => {
  switch (bucket) {
    case "minute":
      return 1;
    case "five_minutes":
      return 5;
    case "ten_minutes":
      return 10;
    case "fifteen_minutes":
      return 15;
    case "hour":
      return 60;
    default:
      return null;
  }
};

export const bucketDurationMinutes = (bucket: TimeBucket): number => {
  switch (bucket) {
    case "minute":
      return 1;
    case "five_minutes":
      return 5;
    case "ten_minutes":
      return 10;
    case "fifteen_minutes":
      return 15;
    case "hour":
      return 60;
    case "day":
      return 24 * 60;
    case "week":
      return 7 * 24 * 60;
    case "month":
      return 31 * 24 * 60;
    case "year":
      return 366 * 24 * 60;
  }
};

export const canDragSelectBucket = (bucket: TimeBucket) =>
  bucket === "minute" ||
  bucket === "five_minutes" ||
  bucket === "ten_minutes" ||
  bucket === "fifteen_minutes" ||
  bucket === "hour" ||
  bucket === "day";

export const getDragZoomBucket = (
  start: DateTime,
  endExclusive: DateTime,
  sourceBucket: TimeBucket
): TimeBucket | null => {
  let desiredBucket: TimeBucket | null = null;

  if (sourceBucket === "day") {
    const days = Math.round(endExclusive.startOf("day").diff(start.startOf("day"), "days").days);
    desiredBucket = days <= 3 ? "hour" : null;
  } else {
    const minutes = endExclusive.diff(start, "minutes").minutes;
    if (minutes <= 60) desiredBucket = "minute";
    else if (minutes <= 3 * 24 * 60) desiredBucket = "hour";
  }

  if (!desiredBucket) return null;
  return bucketDurationMinutes(desiredBucket) < bucketDurationMinutes(sourceBucket) ? desiredBucket : null;
};

export type ChartTimeBounds = {
  min: Date | undefined;
  max: Date | undefined;
};

// Weekly buckets follow two conventions at once: the analytics queries floor
// with ClickHouse's `toStartOfWeek` (Sunday) and the dashboard cards with
// `toStartOfInterval(..., INTERVAL 1 WEEK)` (Monday) — verified, they differ by
// a day. Luxon's `startOf("week")` is Monday. Take the later of the two floors
// so neither convention's final bucket lands past the max, where consumers drop
// it and the axis clips it; the cost is at most a day of trailing gutter.
const floorToWeekStart = (dt: DateTime): DateTime => {
  const day = dt.startOf("day");
  const sunday = day.minus({ days: dt.weekday % 7 }); // Luxon weekday: 1 = Monday, 7 = Sunday
  const monday = day.minus({ days: dt.weekday - 1 });
  return sunday > monday ? sunday : monday;
};

const floorToBucketStart = (dt: DateTime, bucket: TimeBucket): DateTime =>
  bucket === "week" ? floorToWeekStart(dt) : floorToBucket(dt, bucket);

/**
 * The start of the bucket holding `start` — the left edge of the x domain.
 * A period rarely starts on a week or month boundary ("last 60 days"), and
 * the API reports its first bucket at the boundary *before* the period start;
 * anchoring the domain at the period start instead put that bucket left of
 * the axis, where every chart drops it. Weeks floor to the Sunday the analytics
 * queries use (`toStartOfWeek`); the Monday convention's first bucket then sits
 * a day inside the edge, which is only a day of leading gutter.
 */
const firstBucketStart = (start: DateTime, bucket: TimeBucket): DateTime =>
  bucket === "week" ? start.startOf("day").minus({ days: start.weekday % 7 }) : floorToBucket(start, bucket);

/**
 * The start of the final bucket in `[start, endExclusive)`. Bounds end there
 * rather than at the period's last millisecond so the closing tick sits on the
 * right edge instead of a whole bucket short of it.
 */
const lastBucketStart = (start: DateTime, endExclusive: DateTime, bucket: TimeBucket): Date => {
  const lastInstant = endExclusive.minus({ milliseconds: 1 });
  const last = floorToBucketStart(lastInstant, bucket);
  // A period holding a single bucket would otherwise collapse the x domain.
  return (last > start ? last : lastInstant).toJSDate();
};

// Returns full-period x-scale bounds so related charts share a congruent scale.
export const getChartTimeBounds = (time: Time, bucket: TimeBucket, timezone: string): ChartTimeBounds => {
  if (time.mode === "past-minutes") {
    const startUnit = time.pastMinutesStart < 360 ? "minute" : "hour";
    const min = DateTime.now()
      .setZone(timezone)
      .minus({ minutes: time.pastMinutesStart })
      .startOf(startUnit)
      .toJSDate();
    const max =
      bucket === "hour"
        ? DateTime.now().setZone(timezone).minus({ minutes: time.pastMinutesEnd }).startOf("hour").toJSDate()
        : undefined;
    return { min, max };
  }

  if (time.mode === "day") {
    const day = DateTime.fromISO(time.day, { zone: timezone }).startOf("day");
    const min = firstBucketStart(day, bucket);
    return {
      min: min.toJSDate(),
      max: lastBucketStart(min, day.plus({ days: 1 }), bucket),
    };
  }

  if (time.mode === "week") {
    const week = DateTime.fromISO(time.week, { zone: timezone }).startOf("week");
    const min = firstBucketStart(week, bucket);
    return {
      min: min.toJSDate(),
      max: lastBucketStart(min, week.plus({ weeks: 1 }), bucket),
    };
  }

  if (time.mode === "month") {
    const month = DateTime.fromISO(time.month, {
      zone: timezone,
    }).startOf("month");
    const min = firstBucketStart(month, bucket);
    return {
      min: min.toJSDate(),
      max: lastBucketStart(min, month.plus({ months: 1 }), bucket),
    };
  }

  if (time.mode === "year") {
    const year = DateTime.fromISO(time.year, { zone: timezone }).startOf("year");
    const min = firstBucketStart(year, bucket);
    return {
      min: min.toJSDate(),
      max: lastBucketStart(min, year.plus({ years: 1 }), bucket),
    };
  }

  if (time.mode === "range") {
    if (time.startTime && time.endTime) {
      const start = DateTime.fromISO(`${time.startDate}T${time.startTime}`, {
        zone: timezone,
      });
      const endExclusive = DateTime.fromISO(`${time.endDate}T${time.endTime}`, { zone: timezone });
      const min = firstBucketStart(start, bucket);
      return {
        min: min.toJSDate(),
        max: lastBucketStart(min, endExclusive, bucket),
      };
    }

    const start = DateTime.fromISO(time.startDate, { zone: timezone }).startOf("day");
    const endExclusive = DateTime.fromISO(time.endDate, { zone: timezone }).startOf("day").plus({ days: 1 });
    const min = firstBucketStart(start, bucket);
    return {
      min: min.toJSDate(),
      max: lastBucketStart(min, endExclusive, bucket),
    };
  }

  return { min: undefined, max: undefined };
};
