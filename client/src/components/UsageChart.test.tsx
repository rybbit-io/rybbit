import { DateTime, Settings } from "luxon";
import { afterEach, describe, expect, it, vi } from "vitest";

import { parseUsageDay } from "./EventUsageChart";
import { getPeriodDates } from "./UsageChart";

const systemZone = Settings.defaultZone;

afterEach(() => {
  Settings.defaultZone = systemZone;
  vi.useRealTimers();
});

describe("getPeriodDates", () => {
  it("covers exactly `period` days, today included", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-24T12:00:00Z"));

    const { startDate, endDate } = getPeriodDates("7");

    expect({ startDate, endDate }).toEqual({ startDate: "2026-10-18", endDate: "2026-10-24" });
    const days = DateTime.fromISO(endDate!).diff(DateTime.fromISO(startDate!), "days").days + 1;
    expect(days).toBe(7);
  });

  it("uses dates in the requested zone, not the browser's", () => {
    // 08:00 on the 24th in Tokyo is still the 23rd in UTC.
    Settings.defaultZone = "Asia/Tokyo";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-23T23:00:00Z"));

    expect(getPeriodDates("7")).toEqual({ startDate: "2026-10-17", endDate: "2026-10-23" });
    expect(getPeriodDates("7", "Asia/Tokyo")).toEqual({ startDate: "2026-10-18", endDate: "2026-10-24" });
  });

  it("is unbounded for all time", () => {
    expect(getPeriodDates("all")).toEqual({});
  });
});

describe("parseUsageDay", () => {
  it.each(["Asia/Tokyo", "America/Los_Angeles", "UTC"])("keeps the row's calendar day in %s", zone => {
    Settings.defaultZone = zone;

    const day = parseUsageDay("2026-10-23 00:00:00");

    expect(day.toFormat("yyyy-MM-dd")).toBe("2026-10-23");
    expect(new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: "UTC" }).format(day.toJSDate())).toBe("23");
  });
});
