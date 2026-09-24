"use client";

import { getTimezone, useStore } from "@/lib/store";
import { LITE_DASHBOARD } from "@/lib/const";
import { SelectItem, Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TimeBucket } from "@rybbit/shared";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { Time } from "./DateSelector/types";
import { TimerReset } from "lucide-react";

const bucketDurationMinutes = (bucket: TimeBucket): number => {
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
      return 1440;
    case "week":
      return 7 * 1440;
    case "month":
      return 30 * 1440;
    case "year":
      return 365 * 1440;
  }
};

const getRangeDurationMinutes = (time: Time): number | null => {
  const timezone = getTimezone();

  if (time.mode === "past-minutes") {
    return time.pastMinutesStart - (time.pastMinutesEnd ?? 0);
  }

  if (time.mode === "day") return 1440;
  if (time.mode === "week") return 7 * 1440;

  if (time.mode === "month") {
    const start = DateTime.fromISO(time.month, { zone: timezone }).startOf("month");
    return start.plus({ months: 1 }).diff(start, "minutes").minutes;
  }

  if (time.mode === "year") {
    const start = DateTime.fromISO(time.year, { zone: timezone }).startOf("year");
    return start.plus({ years: 1 }).diff(start, "minutes").minutes;
  }

  if (time.mode === "range") {
    if (time.startTime && time.endTime) {
      return DateTime.fromISO(`${time.endDate}T${time.endTime}`, { zone: timezone }).diff(
        DateTime.fromISO(`${time.startDate}T${time.startTime}`, { zone: timezone }),
        "minutes"
      ).minutes;
    }

    return DateTime.fromISO(time.endDate, { zone: timezone })
      .plus({ days: 1 })
      .startOf("day")
      .diff(DateTime.fromISO(time.startDate, { zone: timezone }).startOf("day"), "minutes").minutes;
  }

  return null;
};

export function BucketSelection({ size = "sm" }: { size?: "default" | "sm" }) {
  const t = useExtracted();
  const { bucket, setBucket, time } = useStore();

  const renderOptions = (options: TimeBucket[], durationMinutes: number | null) => {
    const availableOptions = options.filter(
      option =>
        // The lite dashboard is backed by hourly materialized views, so buckets
        // finer than an hour have no underlying data.
        (!LITE_DASHBOARD || bucketDurationMinutes(option) >= 60) &&
        (durationMinutes === null || durationMinutes >= bucketDurationMinutes(option) * 2)
    );

    return (
      <SelectContent size={size}>
        {availableOptions.map(option => (
          <SelectItem key={option} size={size} value={option}>
            {getBucketLabel(option)}
          </SelectItem>
        ))}
      </SelectContent>
    );
  };

  const getBucketLabel = (bucket: TimeBucket) => {
    switch (bucket) {
      case "minute":
        return t("Min");
      case "five_minutes":
        return t("5 Min");
      case "ten_minutes":
        return t("10 Min");
      case "fifteen_minutes":
        return t("15 Min");
      case "hour":
        return t("Hour");
      case "day":
        return t("Day");
      case "week":
        return t("Week");
      case "month":
        return t("Month");
      case "year":
        return t("Year");
    }
  };

  const getOptions = (time: Time) => {
    const durationMinutes = getRangeDurationMinutes(time);

    if (time.mode === "past-minutes") {
      const timeDiff = time.pastMinutesStart - (time.pastMinutesEnd ?? 0);

      if (time.pastMinutesStart >= 1440) {
        return renderOptions(["minute", "five_minutes", "fifteen_minutes", "hour"], durationMinutes);
      }
      if (timeDiff > 120) {
        return renderOptions(["hour"], durationMinutes);
      }
      // For shorter durations, exclude hour buckets
      return renderOptions(["minute"], durationMinutes);
    }
    if (time.mode === "day") {
      return renderOptions(["minute", "five_minutes", "fifteen_minutes", "hour"], durationMinutes);
    }
    if (time.mode === "week") {
      return renderOptions(["fifteen_minutes", "hour", "day"], durationMinutes);
    }
    if (time.mode === "month") {
      return renderOptions(["hour", "day", "week"], durationMinutes);
    }
    if (time.mode === "year" || time.mode === "all-time") {
      return renderOptions(["day", "week", "month"], durationMinutes);
    }

    if (time.mode === "range") {
      const exactRange = Boolean(time.startTime && time.endTime);
      const timezone = getTimezone();
      const exactRangeMinutes = exactRange
        ? DateTime.fromISO(`${time.endDate}T${time.endTime}`, { zone: timezone }).diff(
            DateTime.fromISO(`${time.startDate}T${time.startTime}`, { zone: timezone }),
            "minutes"
          ).minutes
        : undefined;
      const timeRangeLength =
        exactRangeMinutes !== undefined
          ? exactRangeMinutes / 1440
          : DateTime.fromISO(time.endDate, { zone: timezone }).diff(
              DateTime.fromISO(time.startDate, { zone: timezone }),
              "days"
            ).days + 1;

      const options: TimeBucket[] = [];
      if (timeRangeLength <= 1) options.push("minute");
      if (timeRangeLength <= 7) options.push("five_minutes");
      if (timeRangeLength <= 14) options.push("ten_minutes", "fifteen_minutes");
      if (timeRangeLength <= 30) options.push("hour");
      if (timeRangeLength >= 1) options.push("day");
      if (timeRangeLength >= 28) options.push("week");
      if (timeRangeLength >= 60) options.push("month");

      return renderOptions(options, durationMinutes);
    }
  };

  return (
    <Select value={bucket} onValueChange={setBucket}>
      <SelectTrigger className="w-[90px]" size={size}>
        <div className="flex items-center gap-1">
          <TimerReset className={size === "sm" ? "w-3 h-3" : "w-4 h-4"} />
          <SelectValue />
        </div>
      </SelectTrigger>
      {getOptions(time)}
    </Select>
  );
}
