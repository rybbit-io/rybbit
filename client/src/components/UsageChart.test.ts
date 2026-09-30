import { Settings } from "luxon";
import { afterEach, describe, expect, it } from "vitest";
import { getPeriodDates } from "./UsageChart";

const originalNow = Settings.now;
const originalZone = Settings.defaultZone;

afterEach(() => {
  Settings.now = originalNow;
  Settings.defaultZone = originalZone;
});

describe("getPeriodDates", () => {
  it("uses the query timezone at a UTC calendar boundary, keeping the local default", () => {
    Settings.now = () => Date.parse("2026-09-30T00:30:00Z");
    Settings.defaultZone = "America/Los_Angeles";

    expect(getPeriodDates("7", "UTC")).toEqual({ startDate: "2026-09-23", endDate: "2026-09-30" });
    expect(getPeriodDates("7")).toEqual({ startDate: "2026-09-22", endDate: "2026-09-29" });
  });

  it("uses the next calendar date in a timezone ahead of UTC", () => {
    Settings.now = () => Date.parse("2026-09-30T23:30:00Z");
    expect(getPeriodDates("7", "Asia/Tokyo")).toEqual({ startDate: "2026-09-24", endDate: "2026-10-01" });
    expect(getPeriodDates("all", "UTC")).toEqual({});
  });
});
