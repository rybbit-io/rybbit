import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { Time } from "../components/DateSelector/types";
import { getDashboardTimeForRange } from "./defaultTimeRange";
import {
  canGoForward,
  deriveTimeState,
  getBucketForDateTimeRange,
  recalculateTimeForTimezone,
  shiftTimeBackward,
  shiftTimeForward,
  timeToUrlParams,
  urlParamsToTime,
} from "./time";

const ZONE = "America/New_York";

const dt = (iso: string, zone = ZONE) => DateTime.fromISO(iso, { zone });

describe("deriveTimeState", () => {
  it("day: previous day, hour bucket", () => {
    expect(deriveTimeState({ mode: "day", day: "2024-03-15" }, ZONE)).toEqual({
      previousTime: { mode: "day", day: "2024-03-14" },
      bucket: "hour",
    });
  });

  it("day: steps across month boundaries", () => {
    expect(deriveTimeState({ mode: "day", day: "2024-03-01" }, ZONE).previousTime).toEqual({
      mode: "day",
      day: "2024-02-29",
    });
  });

  it("past-minutes: doubles the window backwards, minute bucket for short windows", () => {
    expect(deriveTimeState({ mode: "past-minutes", pastMinutesStart: 30, pastMinutesEnd: 0 }, ZONE)).toEqual({
      previousTime: { mode: "past-minutes", pastMinutesStart: 60, pastMinutesEnd: 30 },
      bucket: "minute",
    });
  });

  it("past-minutes: windows over 2h keep the hour bucket", () => {
    const { bucket } = deriveTimeState({ mode: "past-minutes", pastMinutesStart: 1440, pastMinutesEnd: 0 }, ZONE);
    expect(bucket).toBe("hour");
  });

  it("range: previous range is the same length, ending the day before the start", () => {
    const { previousTime, bucket } = deriveTimeState(
      { mode: "range", startDate: "2024-03-08", endDate: "2024-03-14" },
      ZONE
    );
    expect(previousTime).toEqual({ mode: "range", startDate: "2024-03-01", endDate: "2024-03-07" });
    expect(bucket).toBe("day");
  });

  it("range: bucket scales with the range length", () => {
    expect(deriveTimeState({ mode: "range", startDate: "2024-01-01", endDate: "2024-02-15" }, ZONE).bucket).toBe(
      "week"
    );
    expect(deriveTimeState({ mode: "range", startDate: "2023-01-01", endDate: "2024-01-01" }, ZONE).bucket).toBe(
      "month"
    );
  });

  it("range with times: shifts by the exact duration in the given zone", () => {
    const { previousTime, bucket } = deriveTimeState(
      {
        mode: "range",
        startDate: "2024-03-15",
        startTime: "09:00:00",
        endDate: "2024-03-15",
        endTime: "17:00:00",
      },
      ZONE
    );
    expect(previousTime).toEqual({
      mode: "range",
      startDate: "2024-03-15",
      startTime: "01:00:00",
      endDate: "2024-03-15",
      endTime: "09:00:00",
    });
    expect(bucket).toBe("five_minutes");
  });

  it("week/month/year: step one unit back with day/day/month buckets", () => {
    expect(deriveTimeState({ mode: "week", week: "2024-03-11" }, ZONE)).toEqual({
      previousTime: { mode: "week", week: "2024-03-04" },
      bucket: "day",
    });
    expect(deriveTimeState({ mode: "month", month: "2024-03-01" }, ZONE)).toEqual({
      previousTime: { mode: "month", month: "2024-02-01" },
      bucket: "day",
    });
    expect(deriveTimeState({ mode: "year", year: "2024-01-01" }, ZONE)).toEqual({
      previousTime: { mode: "year", year: "2023-01-01" },
      bucket: "month",
    });
  });

  it("all-time: previous is all-time, day bucket", () => {
    expect(deriveTimeState({ mode: "all-time" }, ZONE)).toEqual({
      previousTime: { mode: "all-time" },
      bucket: "day",
    });
  });
});

describe("getBucketForDateTimeRange", () => {
  it("maps duration to bucket at each threshold", () => {
    const start = dt("2024-03-15T00:00:00");
    expect(getBucketForDateTimeRange(start, start.plus({ hours: 2 }))).toBe("minute");
    expect(getBucketForDateTimeRange(start, start.plus({ hours: 24 }))).toBe("five_minutes");
    expect(getBucketForDateTimeRange(start, start.plus({ days: 14 }))).toBe("hour");
    expect(getBucketForDateTimeRange(start, start.plus({ days: 60 }))).toBe("day");
    expect(getBucketForDateTimeRange(start, start.plus({ days: 180 }))).toBe("week");
    expect(getBucketForDateTimeRange(start, start.plus({ days: 181 }))).toBe("month");
  });
});

describe("shiftTimeBackward / shiftTimeForward", () => {
  it("day: moves one day either direction (forward has no future clamp)", () => {
    expect(shiftTimeBackward({ mode: "day", day: "2024-03-15" }, ZONE)).toEqual({ mode: "day", day: "2024-03-14" });
    expect(shiftTimeForward({ mode: "day", day: "2024-03-15" }, ZONE, dt("2024-03-15T12:00:00"))).toEqual({
      mode: "day",
      day: "2024-03-16",
    });
  });

  it("range: shifts by the range length", () => {
    expect(shiftTimeBackward({ mode: "range", startDate: "2024-03-08", endDate: "2024-03-14" }, ZONE)).toEqual({
      mode: "range",
      startDate: "2024-03-02",
      endDate: "2024-03-08",
    });
    expect(
      shiftTimeForward({ mode: "range", startDate: "2024-03-01", endDate: "2024-03-07" }, ZONE, dt("2024-03-20T00:00:00"))
    ).toEqual({ mode: "range", startDate: "2024-03-07", endDate: "2024-03-13" });
  });

  it("range: forward is blocked when the whole range would be in the future", () => {
    expect(
      shiftTimeForward({ mode: "range", startDate: "2024-03-10", endDate: "2024-03-16" }, ZONE, dt("2024-03-14T00:00:00"))
    ).toBeNull();
  });

  it("single-day range: steps one day, blocked at the future edge", () => {
    const now = dt("2024-03-15T12:00:00");
    expect(shiftTimeForward({ mode: "range", startDate: "2024-03-14", endDate: "2024-03-14" }, ZONE, now)).toEqual({
      mode: "range",
      startDate: "2024-03-15",
      endDate: "2024-03-15",
    });
    expect(shiftTimeForward({ mode: "range", startDate: "2024-03-15", endDate: "2024-03-15" }, ZONE, now)).toBeNull();
  });

  it("range with times: forward clamps the end at now", () => {
    const now = dt("2024-03-15T20:00:00");
    const shifted = shiftTimeForward(
      {
        mode: "range",
        startDate: "2024-03-15",
        startTime: "08:00:00",
        endDate: "2024-03-15",
        endTime: "16:00:00",
      },
      ZONE,
      now
    );
    expect(shifted).toEqual({
      mode: "range",
      startDate: "2024-03-15",
      startTime: "16:00:00",
      endDate: "2024-03-15",
      endTime: "20:00:00",
    });
  });

  it("range with times: forward is blocked when the next window starts in the future", () => {
    expect(
      shiftTimeForward(
        {
          mode: "range",
          startDate: "2024-03-15",
          startTime: "08:00:00",
          endDate: "2024-03-15",
          endTime: "16:00:00",
        },
        ZONE,
        dt("2024-03-15T12:00:00")
      )
    ).toBeNull();
  });

  it("all-time and past-minutes do not navigate", () => {
    expect(shiftTimeBackward({ mode: "all-time" }, ZONE)).toBeNull();
    expect(shiftTimeForward({ mode: "all-time" }, ZONE)).toBeNull();
    expect(shiftTimeBackward({ mode: "past-minutes", pastMinutesStart: 30, pastMinutesEnd: 0 }, ZONE)).toBeNull();
  });
});

describe("canGoForward", () => {
  const now = dt("2024-03-15T12:00:00");

  it("day: false for today and the future, true for the past", () => {
    expect(canGoForward({ mode: "day", day: "2024-03-15" }, ZONE, now)).toBe(false);
    expect(canGoForward({ mode: "day", day: "2024-03-14" }, ZONE, now)).toBe(true);
  });

  it("range: gated by the end date", () => {
    expect(canGoForward({ mode: "range", startDate: "2024-03-01", endDate: "2024-03-15" }, ZONE, now)).toBe(false);
    expect(canGoForward({ mode: "range", startDate: "2024-03-01", endDate: "2024-03-14" }, ZONE, now)).toBe(true);
  });

  it("range with times: gated by the end datetime against now in the zone", () => {
    const range = {
      mode: "range",
      startDate: "2024-03-15",
      startTime: "00:00:00",
      endDate: "2024-03-15",
      endTime: "11:00:00",
    } satisfies Time;
    expect(canGoForward(range, ZONE, now)).toBe(true);
    expect(canGoForward({ ...range, endTime: "13:00:00" }, ZONE, now)).toBe(false);
  });

  it("week/month/year: gated by the period start (quirk: the CURRENT period can still step forward, into an entirely-future one)", () => {
    expect(canGoForward({ mode: "week", week: "2024-03-11" }, ZONE, now)).toBe(true);
    expect(canGoForward({ mode: "week", week: "2024-03-18" }, ZONE, now)).toBe(false);
    expect(canGoForward({ mode: "month", month: "2024-03-01" }, ZONE, now)).toBe(true);
    expect(canGoForward({ mode: "month", month: "2024-04-01" }, ZONE, now)).toBe(false);
    expect(canGoForward({ mode: "year", year: "2024-01-01" }, ZONE, now)).toBe(true);
    expect(canGoForward({ mode: "year", year: "2025-01-01" }, ZONE, now)).toBe(false);
  });

  it("all-time and past-minutes: never", () => {
    expect(canGoForward({ mode: "all-time" }, ZONE, now)).toBe(false);
    expect(canGoForward({ mode: "past-minutes", pastMinutesStart: 30, pastMinutesEnd: 0 }, ZONE, now)).toBe(false);
  });
});

describe("recalculateTimeForTimezone", () => {
  it("re-anchors date presets via the canonical preset table", () => {
    const time: Time = { mode: "day", day: "2024-03-15", wellKnown: "today" };
    expect(recalculateTimeForTimezone(time, "Asia/Tokyo")).toEqual(getDashboardTimeForRange("today", "Asia/Tokyo"));
  });

  it("returns null for past-minutes presets and non-preset times", () => {
    expect(
      recalculateTimeForTimezone(
        { mode: "past-minutes", pastMinutesStart: 30, pastMinutesEnd: 0, wellKnown: "last-30-minutes" },
        "Asia/Tokyo"
      )
    ).toBeNull();
    expect(recalculateTimeForTimezone({ mode: "day", day: "2024-03-15" }, "Asia/Tokyo")).toBeNull();
  });
});

describe("URL serialization", () => {
  it("a preset serializes as wellKnown alone", () => {
    const params = timeToUrlParams({ mode: "day", day: "2024-03-15", wellKnown: "today" });
    expect(params.wellKnown).toBe("today");
    expect(params.day).toBeNull();
    expect(params.timeMode).toBe("day");
  });

  it("explicit times round-trip through the URL for every mode", () => {
    const times: Time[] = [
      { mode: "day", day: "2024-03-15" },
      { mode: "range", startDate: "2024-03-01", endDate: "2024-03-14" },
      {
        mode: "range",
        startDate: "2024-03-01",
        endDate: "2024-03-14",
        startTime: "08:00:00",
        endTime: "17:00:00",
      },
      { mode: "week", week: "2024-03-11" },
      { mode: "month", month: "2024-03-01" },
      { mode: "year", year: "2024-01-01" },
      { mode: "past-minutes", pastMinutesStart: 30, pastMinutesEnd: 0 },
      { mode: "all-time" },
    ];

    for (const time of times) {
      expect(urlParamsToTime(timeToUrlParams(time), ZONE)).toEqual(time);
    }
  });

  it("a wellKnown param deserializes through the preset table", () => {
    expect(urlParamsToTime({ wellKnown: "last-7-days" }, ZONE)).toEqual(getDashboardTimeForRange("last-7-days", ZONE));
  });

  it("incomplete params fall through to null", () => {
    expect(urlParamsToTime({}, ZONE)).toBeNull();
    expect(urlParamsToTime({ timeMode: "range", startDate: "2024-03-01" }, ZONE)).toBeNull();
    expect(urlParamsToTime({ timeMode: "day" }, ZONE)).toBeNull();
  });

  it("mode switches clear the other modes' fields", () => {
    const params = timeToUrlParams({ mode: "week", week: "2024-03-11" });
    expect(params.week).toBe("2024-03-11");
    expect(params.day).toBeNull();
    expect(params.startDate).toBeNull();
    expect(params.past_minutes_start).toBeNull();
  });
});
