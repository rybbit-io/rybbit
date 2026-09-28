import { describe, expect, it } from "vitest";
import { defaultToRouteGroups } from "./routeGroups";
describe("Top Pages default", () => {
  it("uses route groups for month, year, all time, and 30+ calendar days", () => {
    expect(defaultToRouteGroups({ mode: "month", month: "2026-02-01" }, "UTC")).toBe(true);
    expect(defaultToRouteGroups({ mode: "year", year: "2026-01-01" }, "UTC")).toBe(true);
    expect(defaultToRouteGroups({ mode: "all-time" }, "UTC")).toBe(true);
    expect(
      defaultToRouteGroups({ mode: "range", startDate: "2026-03-01", endDate: "2026-03-30" }, "America/New_York")
    ).toBe(true);
    expect(defaultToRouteGroups({ mode: "past-minutes", pastMinutesStart: 43200, pastMinutesEnd: 0 }, "UTC")).toBe(
      true
    );
  });
  it("keeps short date ranges on individual pages", () => {
    expect(defaultToRouteGroups({ mode: "day", day: "2026-03-01" }, "UTC")).toBe(false);
    expect(
      defaultToRouteGroups({ mode: "range", startDate: "2026-03-01", endDate: "2026-03-29" }, "America/New_York")
    ).toBe(false);
  });
});
