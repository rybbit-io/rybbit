"use client";

import { useStore } from "@/lib/store";
import { SelectItem, Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateTime } from "luxon";
import { Time } from "./DateSelector/types";

const getOptions = (time: Time) => {
  if (time.mode === "past-minutes") {
    if (time.pastMinutesStart >= 1440) {
      return (
        <SelectContent>
          <SelectItem size="sm" value="minute">
            Minute
          </SelectItem>
          <SelectItem size="sm" value="five_minutes">
            5 Minutes
          </SelectItem>
          <SelectItem size="sm" value="fifteen_minutes">
            15 Minutes
          </SelectItem>
          <SelectItem size="sm" value="hour">
            Hour
          </SelectItem>
        </SelectContent>
      );
    }
    if (time.pastMinutesStart >= 360) {
      return (
        <SelectContent>
          <SelectItem size="sm" value="hour">
            Hour
          </SelectItem>
        </SelectContent>
      );
    }
    // For shorter durations, exclude hour buckets
    return (
      <SelectContent>
        <SelectItem size="sm" value="minute">
          Minute
        </SelectItem>
      </SelectContent>
    );
  }
  if (time.mode === "day") {
    return (
      <SelectContent>
        <SelectItem size="sm" value="minute">
          Minute
        </SelectItem>
        <SelectItem size="sm" value="five_minutes">
          5 Minutes
        </SelectItem>
        <SelectItem size="sm" value="fifteen_minutes">
          15 Minutes
        </SelectItem>
        <SelectItem size="sm" value="hour">
          Hour
        </SelectItem>
      </SelectContent>
    );
  }
  if (time.mode === "week") {
    return (
      <SelectContent>
        <SelectItem size="sm" value="fifteen_minutes">
          15 Minutes
        </SelectItem>
        <SelectItem size="sm" value="hour">
          Hour
        </SelectItem>
        <SelectItem size="sm" value="day">
          Day
        </SelectItem>
      </SelectContent>
    );
  }
  if (time.mode === "month") {
    return (
      <SelectContent>
        <SelectItem size="sm" value="hour">
          Hour
        </SelectItem>
        <SelectItem size="sm" value="day">
          Day
        </SelectItem>
        <SelectItem size="sm" value="week">
          Week
        </SelectItem>
      </SelectContent>
    );
  }
  if (time.mode === "year" || time.mode === "all-time") {
    return (
      <SelectContent>
        <SelectItem size="sm" value="day">
          Day
        </SelectItem>
        <SelectItem size="sm" value="week">
          Week
        </SelectItem>
        <SelectItem size="sm" value="month">
          Month
        </SelectItem>
      </SelectContent>
    );
  }

  if (time.mode === "range") {
    const timeRangeLength = DateTime.fromISO(time.endDate).diff(DateTime.fromISO(time.startDate), "days").days;

    return (
      <SelectContent>
        {timeRangeLength <= 7 && (
          <SelectItem size="sm" value="five_minutes">
            5 Minutes
          </SelectItem>
        )}
        {timeRangeLength <= 14 && (
          <>
            <SelectItem size="sm" value="ten_minutes">
              10 Minutes
            </SelectItem>
            <SelectItem size="sm" value="fifteen_minutes">
              15 Minutes
            </SelectItem>
          </>
        )}
        {timeRangeLength <= 30 && (
          <SelectItem size="sm" value="hour">
            Hour
          </SelectItem>
        )}
        {timeRangeLength > 1 && (
          <SelectItem size="sm" value="day">
            Day
          </SelectItem>
        )}
        {timeRangeLength >= 28 && (
          <SelectItem size="sm" value="week">
            Week
          </SelectItem>
        )}
        {timeRangeLength >= 60 && (
          <SelectItem size="sm" value="month">
            Month
          </SelectItem>
        )}
      </SelectContent>
    );
  }
};

export function BucketSelection() {
  const { bucket, setBucket, time } = useStore();

  return (
    <Select value={bucket} onValueChange={setBucket}>
      <SelectTrigger className="w-[100px]" size="sm">
        <SelectValue />
      </SelectTrigger>
      {getOptions(time)}
    </Select>
  );
}
