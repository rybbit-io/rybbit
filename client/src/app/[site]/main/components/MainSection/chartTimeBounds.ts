import { TimeBucket } from "@rybbit/shared";
import { DateTime } from "luxon";
import { Time } from "../../../../../components/DateSelector/types";

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

const stepBucket = (dt: DateTime, bucket: TimeBucket, direction: 1 | -1): DateTime => {
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

export type ChartTimeBounds = { min: Date | undefined; max: Date | undefined };

// Returns full-period x-scale bounds so the current and previous charts share
// a congruent scale and corresponding data points line up when overlaid.
export const getChartTimeBounds = (
  time: Time,
  bucket: TimeBucket,
  timezone: string
): ChartTimeBounds => {
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
        ? DateTime.now()
            .setZone(timezone)
            .minus({ minutes: time.pastMinutesEnd })
            .startOf("hour")
            .toJSDate()
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
    const month = DateTime.fromISO(time.month, { zone: timezone }).startOf("month");
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
      const start = DateTime.fromISO(`${time.startDate}T${time.startTime}`, { zone: timezone });
      const endExclusive = DateTime.fromISO(`${time.endDate}T${time.endTime}`, { zone: timezone });
      const displayEnd = stepBucket(endExclusive, bucket, -1);
      return {
        min: start.toJSDate(),
        max: (displayEnd > start ? displayEnd : endExclusive).toJSDate(),
      };
    }

    return {
      min: DateTime.fromISO(time.startDate, { zone: timezone }).startOf("day").toJSDate(),
      max: DateTime.fromISO(time.endDate, { zone: timezone })
        .endOf("day")
        .minus({ minutes: offset })
        .toJSDate(),
    };
  }

  return { min: undefined, max: undefined };
};
