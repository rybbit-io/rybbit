import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Time } from "../../components/DateSelector/types";
import { getGSCDateRange } from "./gscDateRange";

describe("getGSCDateRange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // March 1 in UTC is still late on February 28 in New York.
    vi.setSystemTime(new Date("2026-03-01T04:30:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses the requested timezone when resolving a live past-minutes window", () => {
    const time: Time = { mode: "past-minutes", pastMinutesStart: 120, pastMinutesEnd: 0 };

    expect(getGSCDateRange(time, "America/New_York")).toEqual({
      startDate: "2026-02-28",
      endDate: "2026-02-28",
    });
    expect(getGSCDateRange(time, "UTC")).toEqual({
      startDate: "2026-03-01",
      endDate: "2026-03-01",
    });
  });

  it("widens a short sub-day window across the local midnight it crosses", () => {
    vi.setSystemTime(new Date("2026-03-01T05:30:00.000Z"));

    expect(
      getGSCDateRange({ mode: "past-minutes", pastMinutesStart: 120, pastMinutesEnd: 0 }, "America/New_York")
    ).toEqual({ startDate: "2026-02-28", endDate: "2026-03-01" });
  });

  it("keeps both edges of a stepped-back past-minutes window", () => {
    expect(
      getGSCDateRange(
        { mode: "past-minutes", pastMinutesStart: 3 * 24 * 60, pastMinutesEnd: 2 * 24 * 60 },
        "America/New_York"
      )
    ).toEqual({ startDate: "2026-02-25", endDate: "2026-02-26" });
  });

  it("clamps all-time to sixteen calendar months ending today", () => {
    expect(getGSCDateRange({ mode: "all-time" }, "America/New_York")).toEqual({
      startDate: "2024-10-28",
      endDate: "2026-02-28",
    });
  });

  it.each([
    [{ mode: "day", day: "2026-02-14" } satisfies Time, { startDate: "2026-02-14", endDate: "2026-02-14" }],
    [
      { mode: "range", startDate: "2026-02-01", endDate: "2026-02-14" } satisfies Time,
      { startDate: "2026-02-01", endDate: "2026-02-14" },
    ],
    [{ mode: "week", week: "2026-02-23" } satisfies Time, { startDate: "2026-02-23", endDate: "2026-03-01" }],
    [{ mode: "month", month: "2024-02-01" } satisfies Time, { startDate: "2024-02-01", endDate: "2024-02-29" }],
    [{ mode: "year", year: "2024-01-01" } satisfies Time, { startDate: "2024-01-01", endDate: "2024-12-31" }],
  ])("maps %s to its whole-day boundaries", (time, expected) => {
    expect(getGSCDateRange(time, "America/New_York")).toEqual(expected);
  });

  it("treats midnight as the exclusive edge of an exact datetime range", () => {
    expect(
      getGSCDateRange(
        {
          mode: "range",
          startDate: "2026-02-25",
          startTime: "09:00",
          endDate: "2026-02-28",
          endTime: "00:00",
        },
        "America/New_York"
      )
    ).toEqual({ startDate: "2026-02-25", endDate: "2026-02-27" });
  });
});
