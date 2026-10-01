import { describe, expect, it } from "vitest";
import { Time } from "../../../../components/DateSelector/types";
import { trendBucketFor } from "./trendBucket";

const ZONE = "America/New_York";

describe("trendBucketFor", () => {
  it.each<[string, Time, string]>([
    ["a single day", { mode: "day", day: "2026-09-30" }, "hour"],
    ["the last 24 hours", { mode: "past-minutes", pastMinutesStart: 1440, pastMinutesEnd: 0 }, "hour"],
    ["two days", { mode: "range", startDate: "2026-09-29", endDate: "2026-09-30" }, "hour"],
    ["three days", { mode: "range", startDate: "2026-09-28", endDate: "2026-09-30" }, "day"],
    ["a week", { mode: "week", week: "2026-09-21" }, "day"],
    ["the last 30 days", { mode: "range", startDate: "2026-09-01", endDate: "2026-09-30" }, "day"],
    ["a month", { mode: "month", month: "2026-09-01" }, "day"],
    ["the last 60 days", { mode: "range", startDate: "2026-08-02", endDate: "2026-09-30" }, "day"],
    ["a quarter", { mode: "range", startDate: "2026-07-01", endDate: "2026-09-30" }, "week"],
    ["a year", { mode: "year", year: "2026-01-01" }, "week"],
    ["two years", { mode: "range", startDate: "2024-10-01", endDate: "2026-09-30" }, "month"],
    ["all time", { mode: "all-time" }, "month"],
  ])("draws %s by the %3$s", (_name, time, expected) => {
    expect(trendBucketFor(time, ZONE)).toBe(expected);
  });

  it("reads a range with times by its real length", () => {
    const time: Time = {
      mode: "range",
      startDate: "2026-09-30",
      startTime: "09:00",
      endDate: "2026-09-30",
      endTime: "17:00",
    };

    expect(trendBucketFor(time, ZONE)).toBe("hour");
  });
});
