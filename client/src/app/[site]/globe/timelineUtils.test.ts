import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import type { GetSessionsResponse } from "../../../api/analytics/endpoints";
import {
  availableWindowSizes,
  bucketForWindow,
  calculateWindowSize,
  generateTimeWindows,
  getActiveSessions,
  MAX_WINDOWS,
  resolveWindowSize,
  sumIntoWindows,
} from "./timelineUtils";

const ZONE = "UTC";
const at = (iso: string) => DateTime.fromISO(iso, { zone: ZONE });
const SEP_1 = at("2026-09-01T00:00:00");

describe("calculateWindowSize", () => {
  it("picks a window that matches the length of the period", () => {
    expect(calculateWindowSize(SEP_1, SEP_1.plus({ hours: 1 }))).toBe(5);
    expect(calculateWindowSize(SEP_1, SEP_1.plus({ days: 1 }))).toBe(60);
    expect(calculateWindowSize(SEP_1, SEP_1.plus({ days: 7 }))).toBe(180);
    expect(calculateWindowSize(SEP_1, SEP_1.plus({ days: 30 }))).toBe(360);
    expect(calculateWindowSize(SEP_1, SEP_1.plus({ days: 31 }))).toBe(360);
    expect(calculateWindowSize(SEP_1, SEP_1.plus({ days: 90 }))).toBe(1440);
  });
});

describe("availableWindowSizes and resolveWindowSize", () => {
  it("offers only sizes that give a drawable number of windows", () => {
    const month = availableWindowSizes(SEP_1, SEP_1.plus({ days: 30 })).map(option => option.label);

    // 30 days at one minute would be 43,200 columns.
    expect(month).not.toContain("1m");
    expect(month).not.toContain("30m");
    expect(month).toEqual(["1h", "3h", "6h", "12h", "1d", "3d", "7d"]);
  });

  it("drops sizes longer than half the period", () => {
    const day = availableWindowSizes(SEP_1, SEP_1.plus({ days: 1 })).map(option => option.label);
    expect(day).toContain("12h");
    expect(day).not.toContain("1d");
  });

  it("always offers something, even for a very long period", () => {
    expect(availableWindowSizes(SEP_1, SEP_1.plus({ years: 30 })).map(option => option.label)).toEqual(["7d"]);
  });

  it("keeps the user's size while the period allows it", () => {
    expect(resolveWindowSize(SEP_1, SEP_1.plus({ days: 30 }), 720)).toBe(720);
    // One-minute windows are not allowed for a month: back to the default.
    expect(resolveWindowSize(SEP_1, SEP_1.plus({ days: 30 }), 1)).toBe(360);
    expect(resolveWindowSize(SEP_1, SEP_1.plus({ days: 30 }), null)).toBe(360);
  });

  it("moves the default up when the period is too long for it", () => {
    // Six years at one day is over the column limit; three days fits.
    expect(resolveWindowSize(SEP_1, SEP_1.plus({ years: 6 }), null)).toBe(4320);
  });
});

describe("generateTimeWindows", () => {
  it("treats the end as exclusive", () => {
    const windows = generateTimeWindows(SEP_1, SEP_1.plus({ days: 1 }), 360);
    expect(windows.map(window => window.toFormat("HH:mm"))).toEqual(["00:00", "06:00", "12:00", "18:00"]);
  });

  it("covers a period that does not divide evenly", () => {
    expect(generateTimeWindows(SEP_1, SEP_1.plus({ hours: 7 }), 180)).toHaveLength(3);
  });

  it("never returns more windows than can be drawn", () => {
    expect(generateTimeWindows(SEP_1, SEP_1.plus({ days: 30 }), 1)).toHaveLength(MAX_WINDOWS);
  });
});

describe("bucketForWindow", () => {
  it("picks the coarsest bucket that divides the window", () => {
    expect(bucketForWindow(1)).toEqual({ bucket: "minute", minutes: 1 });
    expect(bucketForWindow(5)).toEqual({ bucket: "five_minutes", minutes: 5 });
    expect(bucketForWindow(30)).toEqual({ bucket: "fifteen_minutes", minutes: 15 });
    expect(bucketForWindow(360)).toEqual({ bucket: "hour", minutes: 60 });
    expect(bucketForWindow(4320)).toEqual({ bucket: "day", minutes: 1440 });
  });
});

describe("sumIntoWindows", () => {
  it("sums each window's buckets and ignores those outside the period", () => {
    const points = [
      { time: "2026-08-31 23:00:00", sessions: 99 },
      { time: "2026-09-01 00:00:00", sessions: 1 },
      { time: "2026-09-01 05:00:00", sessions: 2 },
      { time: "2026-09-01 06:00:00", sessions: 4 },
      { time: "2026-09-01 23:00:00", sessions: 8 },
      { time: "2026-09-02 00:00:00", sessions: 99 },
    ];

    expect(sumIntoWindows(points, SEP_1, 360, 4, 60, ZONE)).toEqual([3, 4, 0, 8]);
  });

  it("reads bucket times in the site's timezone", () => {
    const zone = "Asia/Kolkata";
    const start = DateTime.fromISO("2026-09-01T00:00:00", { zone });
    const points = [
      { time: "2026-09-01 00:00:00", sessions: 5 },
      { time: "2026-09-02 00:00:00", sessions: 7 },
    ];

    expect(sumIntoWindows(points, start, 1440, 2, 1440, zone)).toEqual([5, 7]);
  });

  it("keeps each day in its own window across a daylight-saving change", () => {
    const zone = "Europe/Berlin";
    // Clocks go back on 25 October 2026: that day is 25 hours long.
    const start = DateTime.fromISO("2026-10-24T00:00:00", { zone });
    const points = [
      { time: "2026-10-24 00:00:00", sessions: 1 },
      { time: "2026-10-25 00:00:00", sessions: 2 },
      { time: "2026-10-26 00:00:00", sessions: 4 },
      { time: "2026-10-27 00:00:00", sessions: 8 },
    ];

    expect(sumIntoWindows(points, start, 1440, 4, 1440, zone)).toEqual([1, 2, 4, 8]);
  });
});

describe("getActiveSessions", () => {
  const session = (id: string, start: string, end: string) =>
    ({ session_id: id, session_start: start, session_end: end }) as GetSessionsResponse[number];

  it("keeps the sessions that overlap the window", () => {
    const sessions = [
      session("before", "2026-09-01 04:00:00", "2026-09-01 05:59:00"),
      session("spans-start", "2026-09-01 05:50:00", "2026-09-01 06:10:00"),
      session("inside", "2026-09-01 07:00:00", "2026-09-01 07:30:00"),
      session("after", "2026-09-01 12:00:00", "2026-09-01 12:10:00"),
    ];
    const active = getActiveSessions(sessions, at("2026-09-01T06:00:00"), 360, ZONE);

    expect(active.map(s => s.session_id)).toEqual(["spans-start", "inside"]);
  });
});
