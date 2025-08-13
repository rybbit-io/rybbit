"use client";

import React from "react";
import { SelectItem, Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";

export type TimeBucket =
  | "minute"
  | "five_minutes"
  | "ten_minutes"
  | "fifteen_minutes"
  | "hour"
  | "day"
  | "week"
  | "month"
  | "year";

interface UptimeBucketSelectionProps {
  timeRange: string;
  bucket: TimeBucket;
  onBucketChange: (bucket: TimeBucket) => void;
}

const getBucketOptions = (timeRange: string): TimeBucket[] => {
  switch (timeRange) {
    case "1h":
      return ["minute", "five_minutes", "fifteen_minutes", "hour"];
    case "6h":
      return ["minute", "five_minutes", "fifteen_minutes", "hour"];
    case "12h":
      return ["minute", "five_minutes", "fifteen_minutes", "hour"];
    case "24h":
      return ["minute", "five_minutes", "fifteen_minutes", "hour"];
    case "3d":
      return ["five_minutes", "fifteen_minutes", "hour"];
    case "7d":
      return ["fifteen_minutes", "hour", "day"];
    case "30d":
      return ["hour", "day", "week"];
    case "90d":
      return ["hour", "day", "week", "month"];
    case "180d":
      return ["hour", "day", "week", "month", "year"];
    case "365d":
      return ["hour", "day", "week", "month", "year"];
    case "all":
      return ["day", "week", "month", "year"];
    default:
      return ["hour"];
  }
};

const bucketLabels: Record<TimeBucket, string> = {
  minute: "Minute",
  five_minutes: "5 Minutes",
  ten_minutes: "10 Minutes",
  fifteen_minutes: "15 Minutes",
  hour: "Hour",
  day: "Day",
  week: "Week",
  month: "Month",
  year: "Year",
};

export function UptimeBucketSelection({ timeRange, bucket, onBucketChange }: UptimeBucketSelectionProps) {
  const availableBuckets = getBucketOptions(timeRange);

  // If current bucket is not available for the time range, select the first available one
  React.useEffect(() => {
    if (!availableBuckets.includes(bucket)) {
      onBucketChange(availableBuckets[0]);
    }
  }, [timeRange, bucket, availableBuckets, onBucketChange]);

  return (
    <Select value={bucket} onValueChange={(value) => onBucketChange(value as TimeBucket)}>
      <SelectTrigger className="w-[120px]" size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {availableBuckets.map((bucketOption) => (
          <SelectItem key={bucketOption} value={bucketOption} size="sm">
            {bucketLabels[bucketOption]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
