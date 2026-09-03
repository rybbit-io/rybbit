import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { Time } from "../DateSelector/types";
import { bucketsBetween, getChartTimeBounds, shiftBuckets } from "./timeSeriesChartUtils";

const ZONE = "America/New_York";

const boundsIso = (time: Time, bucket: Parameters<typeof getChartTimeBounds>[1]) => {
  const { min, max } = getChartTimeBounds(time, bucket, ZONE);
  const iso = (d: Date | undefined) => (d ? DateTime.fromJSDate(d).setZone(ZONE).toISO() : undefined);
  return { min: iso(min), max: iso(max) };
};

describe("getChartTimeBounds", () => {
  it("week: ends on the last day bucket, not the last millisecond", () => {
    expect(boundsIso({ mode: "week", week: "2026-08-17" }, "day")).toEqual({
      min: "2026-08-17T00:00:00.000-04:00",
      max: "2026-08-23T00:00:00.000-04:00",
    });
  });

  it("week: ends on the last hour bucket", () => {
    expect(boundsIso({ mode: "week", week: "2026-08-17" }, "hour").max).toBe("2026-08-23T23:00:00.000-04:00");
  });

  it("month: ends on the last day bucket", () => {
    expect(boundsIso({ mode: "month", month: "2026-08-01" }, "day")).toEqual({
      min: "2026-08-01T00:00:00.000-04:00",
      max: "2026-08-31T00:00:00.000-04:00",
    });
  });

  it("month: weekly buckets clear both the Sunday and the Monday convention", () => {
    // August 2026 ends on a Monday, which `toStartOfInterval(.., 1 WEEK)` buckets
    // a day after `toStartOfWeek` does; stopping on the Sunday would clip it.
    expect(boundsIso({ mode: "month", month: "2026-08-01" }, "week").max).toBe("2026-08-31T00:00:00.000-04:00");
    // January 2027 ends on a Sunday, where the Sunday floor is the later one.
    expect(boundsIso({ mode: "month", month: "2027-01-01" }, "week").max).toBe("2027-01-31T00:00:00.000-05:00");
  });

  it("year: ends on the last month bucket", () => {
    expect(boundsIso({ mode: "year", year: "2026-01-01" }, "month").max).toBe("2026-12-01T00:00:00.000-05:00");
  });

  it("day: ends on the last bucket of the day, across a DST change", () => {
    expect(boundsIso({ mode: "day", day: "2026-08-19" }, "five_minutes").max).toBe("2026-08-19T23:55:00.000-04:00");
    expect(boundsIso({ mode: "day", day: "2026-11-01" }, "hour").max).toBe("2026-11-01T23:00:00.000-05:00");
  });

  it("range: ends on the end date's bucket", () => {
    expect(boundsIso({ mode: "range", startDate: "2026-08-13", endDate: "2026-08-19" }, "day")).toEqual({
      min: "2026-08-13T00:00:00.000-04:00",
      max: "2026-08-19T00:00:00.000-04:00",
    });
  });

  it("range: a single-bucket period keeps a non-empty domain", () => {
    expect(boundsIso({ mode: "range", startDate: "2026-08-19", endDate: "2026-08-19" }, "day")).toEqual({
      min: "2026-08-19T00:00:00.000-04:00",
      max: "2026-08-19T23:59:59.999-04:00",
    });
  });

  it("range: starts on the bucket holding the start date, for week and month buckets", () => {
    // Last 60 days from 2026-09-02 starts on a Saturday; the API's first week
    // bucket is the Sunday before it and the first month bucket is July 1.
    const last60 = { mode: "range", startDate: "2026-07-05", endDate: "2026-09-02" } as const;
    expect(boundsIso(last60, "week")).toEqual({
      min: "2026-07-05T00:00:00.000-04:00",
      max: "2026-08-31T00:00:00.000-04:00",
    });
    expect(boundsIso({ ...last60, startDate: "2026-07-04" }, "week").min).toBe("2026-06-28T00:00:00.000-04:00");
    expect(boundsIso({ ...last60, startDate: "2026-07-04" }, "month")).toEqual({
      min: "2026-07-01T00:00:00.000-04:00",
      max: "2026-09-01T00:00:00.000-04:00",
    });
  });

  it("exact range: starts on the hour bucket holding the start time", () => {
    expect(
      boundsIso(
        { mode: "range", startDate: "2026-08-19", endDate: "2026-08-19", startTime: "09:15:00", endTime: "17:45:00" },
        "hour"
      ).min
    ).toBe("2026-08-19T09:00:00.000-04:00");
  });

  it("exact range: ends on the last bucket inside the exclusive end", () => {
    const exact = {
      mode: "range",
      startDate: "2026-08-19",
      endDate: "2026-08-19",
      startTime: "09:15:00",
      endTime: "17:45:00",
    } as const;
    expect(boundsIso(exact, "hour").max).toBe("2026-08-19T17:00:00.000-04:00");
    expect(boundsIso({ ...exact, startTime: "10:00:00", endTime: "12:00:00" }, "hour").max).toBe(
      "2026-08-19T11:00:00.000-04:00"
    );
  });
});

describe("bucketsBetween / shiftBuckets", () => {
  const at = (iso: string) => DateTime.fromISO(iso, { zone: ZONE });

  it("counts whole weeks between the two periods' first buckets, whichever weekday convention floored them", () => {
    // 60-day period starting Sat Jul 4 (first bucket Sun Jun 28) vs its
    // previous period starting Tue May 5 (first bucket Sun May 3): 8 weeks,
    // not 60 days.
    expect(bucketsBetween(at("2026-05-03"), at("2026-06-28"), "week")).toBe(8);
    expect(bucketsBetween(at("2026-05-04"), at("2026-06-28"), "week")).toBe(8);
  });

  it("shifts month buckets by calendar months so they land on month starts", () => {
    expect(bucketsBetween(at("2026-05-01"), at("2026-07-01"), "month")).toBe(2);
    expect(shiftBuckets(at("2026-05-01"), "month", 2).toISO()).toBe(at("2026-07-01").toISO());
    expect(shiftBuckets(at("2026-06-01"), "month", 2).toISO()).toBe(at("2026-08-01").toISO());
    expect(shiftBuckets(at("2026-07-01"), "month", 2).toISO()).toBe(at("2026-09-01").toISO());
  });

  it("keeps day buckets on midnight across a DST change", () => {
    expect(shiftBuckets(at("2026-10-25"), "day", 14).toISO()).toBe("2026-11-08T00:00:00.000-05:00");
    expect(bucketsBetween(at("2026-10-25"), at("2026-11-08"), "day")).toBe(14);
  });

  it("handles sub-hour buckets", () => {
    expect(bucketsBetween(at("2026-08-19T09:00"), at("2026-08-19T09:30"), "five_minutes")).toBe(6);
    expect(shiftBuckets(at("2026-08-19T09:00"), "fifteen_minutes", 2).toFormat("HH:mm")).toBe("09:30");
  });
});
