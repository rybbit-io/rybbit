import { describe, expect, it } from "vitest";
import {
  capDashboardDefaultRange,
  DASHBOARD_DEFAULT_TIME_RANGES,
  DASHBOARD_TIME_PRESET_GROUPS,
  getDashboardTimeForRange,
} from "./defaultTimeRange";

const EXPECTED_PRESET_GROUPS = [
  ["last-30-minutes", "last-1-hour", "last-6-hours", "last-24-hours"],
  ["today", "yesterday", "last-3-days", "last-7-days", "last-14-days", "last-30-days", "last-60-days"],
  ["this-week", "last-week", "this-month", "last-month", "this-year", "all-time"],
] as const;

describe("dashboard time presets", () => {
  it("makes every well-known range selectable and constructible", () => {
    expect(DASHBOARD_TIME_PRESET_GROUPS.map(group => group.ranges)).toEqual(EXPECTED_PRESET_GROUPS);
    expect(DASHBOARD_DEFAULT_TIME_RANGES).toEqual(EXPECTED_PRESET_GROUPS.flat());

    for (const range of EXPECTED_PRESET_GROUPS.flat()) {
      expect(getDashboardTimeForRange(range, "America/New_York").wellKnown).toBe(range);
    }
  });

  it("includes last week and last month in the calendar-period menu group", () => {
    const calendarPeriods = DASHBOARD_TIME_PRESET_GROUPS.find(group => group.key === "calendar-periods");

    expect(calendarPeriods?.ranges).toContain("last-week");
    expect(calendarPeriods?.ranges).toContain("last-month");
    expect(getDashboardTimeForRange("last-week", "UTC")).toMatchObject({ mode: "week", wellKnown: "last-week" });
    expect(getDashboardTimeForRange("last-month", "UTC")).toMatchObject({
      mode: "month",
      wellKnown: "last-month",
    });
  });
});

describe("capDashboardDefaultRange", () => {
  it("caps an all-time default on the users page", () => {
    expect(capDashboardDefaultRange("all-time", "/1/users")).toBe("last-30-days");
  });

  it("leaves the all-time default alone everywhere else", () => {
    expect(capDashboardDefaultRange("all-time", "/1")).toBe("all-time");
    expect(capDashboardDefaultRange("all-time", "/1/sessions")).toBe("all-time");
    expect(capDashboardDefaultRange("all-time", "/1/user/abc")).toBe("all-time");
  });

  it("never widens or rewrites a bounded default", () => {
    expect(capDashboardDefaultRange("today", "/1/users")).toBe("today");
    expect(capDashboardDefaultRange("last-7-days", "/1/users")).toBe("last-7-days");
  });
});
