import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { profileWindow, singleDayLabel } from "./profileWindow";

describe("singleDayLabel", () => {
  it("names a one-day window once", () => {
    expect(singleDayLabel("Sep 30 – Sep 30")).toBe("Sep 30");
    expect(singleDayLabel("Sep 30 – Sep 30, 2025")).toBe("Sep 30, 2025");
  });

  it("leaves a real range alone", () => {
    expect(singleDayLabel("Aug 3 – Sep 1")).toBe("Aug 3 – Sep 1");
    expect(singleDayLabel("Dec 30 – Jan 5, 2025")).toBe("Dec 30 – Jan 5, 2025");
    expect(singleDayLabel(null)).toBeNull();
  });
});

const zone = "Europe/Stockholm";
const now = DateTime.fromISO("2026-09-30T14:46:00", { zone });

describe("profileWindow", () => {
  it("counts both ends of a date range", () => {
    expect(profileWindow({ mode: "range", startDate: "2026-09-01", endDate: "2026-09-30" }, zone, now)).toEqual({
      start: "2026-09-01",
      end: "2026-09-30",
      days: 30,
    });
  });

  it("is one day for a single day", () => {
    expect(profileWindow({ mode: "day", day: "2026-09-14" }, zone, now)).toEqual({
      start: "2026-09-14",
      end: "2026-09-14",
      days: 1,
    });
  });

  it("stops a period that runs into the future at today", () => {
    expect(profileWindow({ mode: "year", year: "2026-01-01" }, zone, now)).toEqual({
      start: "2026-01-01",
      end: "2026-09-30",
      days: 273,
    });
    expect(profileWindow({ mode: "week", week: "2026-09-28" }, zone, now)?.days).toBe(3);
  });

  it("covers a whole past month", () => {
    expect(profileWindow({ mode: "month", month: "2026-08-01" }, zone, now)?.days).toBe(31);
  });

  it("counts the days a range with times touches", () => {
    const window = profileWindow(
      { mode: "range", startDate: "2026-09-10", endDate: "2026-09-12", startTime: "18:00", endTime: "06:00" },
      zone,
      now
    );
    expect(window).toEqual({ start: "2026-09-10", end: "2026-09-12", days: 3 });
  });

  it("has no day count for all time, a trailing-minutes window, or a period that has not started", () => {
    expect(profileWindow({ mode: "all-time" }, zone, now)).toBeNull();
    expect(profileWindow({ mode: "past-minutes", pastMinutesStart: 60, pastMinutesEnd: 0 }, zone, now)).toBeNull();
    expect(profileWindow({ mode: "day", day: "2026-10-05" }, zone, now)).toBeNull();
  });
});
