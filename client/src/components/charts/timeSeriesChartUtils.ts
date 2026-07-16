import type { TimeBucket } from "@rybbit/shared";
import { DateTime } from "luxon";

import type { Time } from "@/components/DateSelector/types";

const bucketEndOffsetMinutes = (bucket: TimeBucket): number => {
  switch (bucket) {
    case "hour":
      return 59;
    case "fifteen_minutes":
      return 14;
    case "ten_minutes":
      return 9;
    case "five_minutes":
      return 4;
    default:
      return 0;
  }
};

export const stepBucket = (dt: DateTime, bucket: TimeBucket, direction: 1 | -1): DateTime => {
  const n = direction;
  switch (bucket) {
    case "minute":
      return dt.plus({ minutes: n });
    case "five_minutes":
      return dt.plus({ minutes: 5 * n });
    case "ten_minutes":
      return dt.plus({ minutes: 10 * n });
    case "fifteen_minutes":
      return dt.plus({ minutes: 15 * n });
    case "hour":
      return dt.plus({ hours: n });
    case "day":
      return dt.plus({ days: n });
    case "week":
      return dt.plus({ weeks: n });
    case "month":
      return dt.plus({ months: n });
    case "year":
      return dt.plus({ years: n });
  }
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

// Returns full-period x-scale bounds so related charts share a congruent scale.
export const getChartTimeBounds = (time: Time, bucket: TimeBucket, timezone: string): ChartTimeBounds => {
  const offset = bucketEndOffsetMinutes(bucket);

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
    const day = DateTime.fromISO(time.day, { zone: timezone });
    return {
      min: day.startOf("day").toJSDate(),
      max: day.endOf("day").minus({ minutes: offset }).toJSDate(),
    };
  }

  if (time.mode === "week") {
    const week = DateTime.fromISO(time.week, { zone: timezone }).startOf("week");
    return {
      min: week.toJSDate(),
      max: week.endOf("week").minus({ minutes: offset }).toJSDate(),
    };
  }

  if (time.mode === "month") {
    const month = DateTime.fromISO(time.month, {
      zone: timezone,
    }).startOf("month");
    return {
      min: month.toJSDate(),
      max: month.endOf("month").minus({ minutes: offset }).toJSDate(),
    };
  }

  if (time.mode === "year") {
    const year = DateTime.fromISO(time.year, { zone: timezone }).startOf("year");
    return {
      min: year.toJSDate(),
      max: year.endOf("year").minus({ minutes: offset }).toJSDate(),
    };
  }

  if (time.mode === "range") {
    if (time.startTime && time.endTime) {
      const start = DateTime.fromISO(`${time.startDate}T${time.startTime}`, {
        zone: timezone,
      });
      const endExclusive = DateTime.fromISO(`${time.endDate}T${time.endTime}`, { zone: timezone });
      const displayEnd = stepBucket(endExclusive, bucket, -1);
      return {
        min: start.toJSDate(),
        max: (displayEnd > start ? displayEnd : endExclusive).toJSDate(),
      };
    }

    return {
      min: DateTime.fromISO(time.startDate, { zone: timezone }).startOf("day").toJSDate(),
      max: DateTime.fromISO(time.endDate, { zone: timezone }).endOf("day").minus({ minutes: offset }).toJSDate(),
    };
  }

  return { min: undefined, max: undefined };
};
