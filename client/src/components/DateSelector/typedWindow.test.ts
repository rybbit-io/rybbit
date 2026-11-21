import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";

import { parseTypedWindow, timeForTypedWindow } from "./typedWindow";

describe("parseTypedWindow", () => {
  it("reads a count and a unit in the metrics-tool shorthand", () => {
    expect(parseTypedWindow("14d")).toEqual({ count: 14, unit: "day" });
    expect(parseTypedWindow("6h")).toEqual({ count: 6, unit: "hour" });
    expect(parseTypedWindow("90m")).toEqual({ count: 90, unit: "minute" });
    expect(parseTypedWindow("2w")).toEqual({ count: 2, unit: "week" });
  });

  it("tolerates spaces, case and longer unit names", () => {
    expect(parseTypedWindow(" 3 days ")).toEqual({ count: 3, unit: "day" });
    expect(parseTypedWindow("12 HRS")).toEqual({ count: 12, unit: "hour" });
    expect(parseTypedWindow("45 min")).toEqual({ count: 45, unit: "minute" });
  });

  it("keeps bare digits so the rail can show which unit letters finish it", () => {
    expect(parseTypedWindow("14")).toEqual({ count: 14 });
  });

  it("treats anything else as an ordinary search", () => {
    expect(parseTypedWindow("week")).toBeNull();
    expect(parseTypedWindow("14x")).toBeNull();
    expect(parseTypedWindow("0d")).toBeNull();
    expect(parseTypedWindow("")).toBeNull();
    expect(parseTypedWindow("14 d ago")).toBeNull();
  });

  it("refuses windows the dashboard cannot serve", () => {
    expect(parseTypedWindow("400d")).toBeNull();
    expect(parseTypedWindow("53w")).toBeNull();
    expect(parseTypedWindow("200h")).toBeNull();
    expect(parseTypedWindow("999h")).toBeNull();
    expect(parseTypedWindow("168h")).toEqual({ count: 168, unit: "hour" });
  });
});

describe("timeForTypedWindow", () => {
  const zone = "America/New_York";
  const today = DateTime.now().setZone(zone).toISODate();

  it("serves minutes and hours from the realtime path", () => {
    expect(timeForTypedWindow({ count: 90, unit: "minute" }, zone)).toEqual({
      mode: "past-minutes",
      pastMinutesStart: 90,
      pastMinutesEnd: 0,
    });
    expect(timeForTypedWindow({ count: 5, unit: "hour" }, zone)).toEqual({
      mode: "past-minutes",
      pastMinutesStart: 300,
      pastMinutesEnd: 0,
    });
  });

  it("counts days back from today inclusive, the same shape as the day presets", () => {
    expect(timeForTypedWindow({ count: 20, unit: "day" }, zone)).toEqual({
      mode: "range",
      startDate: DateTime.now().setZone(zone).minus({ days: 19 }).toISODate(),
      endDate: today,
    });
    expect(timeForTypedWindow({ count: 3, unit: "week" }, zone)).toEqual({
      mode: "range",
      startDate: DateTime.now().setZone(zone).minus({ days: 20 }).toISODate(),
      endDate: today,
    });
  });

  it("keeps a preset's identity when the typed window lands on one, so it re-resolves tomorrow", () => {
    expect(timeForTypedWindow({ count: 14, unit: "day" }, zone)).toMatchObject({
      mode: "range",
      wellKnown: "last-14-days",
    });
    expect(timeForTypedWindow({ count: 2, unit: "week" }, zone)).toMatchObject({ wellKnown: "last-14-days" });
    expect(timeForTypedWindow({ count: 1, unit: "week" }, zone)).toMatchObject({ wellKnown: "last-7-days" });
    expect(timeForTypedWindow({ count: 1, unit: "day" }, zone)).toEqual({
      mode: "day",
      day: today,
      wellKnown: "today",
    });
    expect(timeForTypedWindow({ count: 6, unit: "hour" }, zone)).toMatchObject({ wellKnown: "last-6-hours" });
    expect(timeForTypedWindow({ count: 60, unit: "minute" }, zone)).toMatchObject({ wellKnown: "last-1-hour" });
    expect(timeForTypedWindow({ count: 24, unit: "hour" }, zone)).toMatchObject({ wellKnown: "last-24-hours" });
  });
});
