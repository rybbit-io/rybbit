import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseTimeWindow, timeWindowWhere } from "../analytics/utils/timeWindow.js";
import { defaultDateRange } from "./getAdminServiceEventCount.js";

// The rows this endpoint returns are daily buckets, so its default range has to
// be whole calendar days in the caller's zone. A rolling 720-hour window would
// open mid-day and return a first bucket holding only part of its day.
describe("defaultDateRange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should end on today and span 30 days", () => {
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
    expect(defaultDateRange("UTC")).toEqual({ start_date: "2024-05-16", end_date: "2024-06-15" });
  });

  it("should roll back across month and year boundaries", () => {
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
    expect(defaultDateRange("UTC").start_date).toBe("2023-12-16");

    vi.setSystemTime(new Date("2024-03-05T12:00:00Z"));
    expect(defaultDateRange("UTC").start_date).toBe("2024-02-04"); // leap year
  });

  // "Today" is a different date either side of midnight, so the range has to be
  // cut in the caller's zone rather than the server's.
  it("should resolve today in the caller's zone", () => {
    vi.setSystemTime(new Date("2024-06-15T02:00:00Z"));
    expect(defaultDateRange("America/New_York").end_date).toBe("2024-06-14");
    expect(defaultDateRange("Asia/Tokyo").end_date).toBe("2024-06-15");
  });

  it("should fall back to UTC for an unusable zone", () => {
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
    expect(defaultDateRange("Not/AZone")).toEqual({ start_date: "2024-05-16", end_date: "2024-06-15" });
  });

  // The point of the range: the predicate opens at a day boundary, not mid-day.
  it("should produce a predicate that opens at local midnight", () => {
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
    const where = timeWindowWhere(parseTimeWindow({ ...defaultDateRange("UTC"), time_zone: "UTC" }));
    expect(where).toContain("toStartOfDay(toDateTime('2024-05-16', 'UTC'))");
  });
});
