import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { planSessionRollups } from "./planner.js";

const now = Date.parse("2026-09-20T22:30:00Z");
const zones = ["UTC", "America/New_York", "Asia/Kolkata"];

function coveredHours(slices: ReturnType<typeof planSessionRollups>) {
  const hours: number[] = [];
  for (const slice of slices!) {
    if (slice.start === null || slice.end === null) throw new Error("Expected bounded slices");
    for (let hour = Math.ceil(slice.start / 3600) * 3600; hour < slice.end; hour += 3600) hours.push(hour);
  }
  return hours;
}

describe("long-range session rollup selection", () => {
  it.each(zones)("covers every requested hour exactly once in %s", time_zone => {
    const params = { start_date: "2026-01-15", end_date: "2026-09-10", time_zone };
    const slices = planSessionRollups(params, zones, undefined, now)!;
    const start = DateTime.fromISO(params.start_date, { zone: time_zone }).toSeconds();
    const end = DateTime.fromISO(params.end_date, { zone: time_zone }).plus({ days: 1 }).toSeconds();
    const expected: number[] = [];
    for (let hour = Math.ceil(start / 3600) * 3600; hour < end; hour += 3600) expected.push(hour);
    expect(coveredHours(slices)).toEqual(expected);
    expect(slices.some(slice => slice.resolution === "month")).toBe(true);
    expect(slices.length).toBeLessThanOrEqual(5);
  });

  it.each(["2024-03-09", "2024-11-02"])(
    "handles DST around %s without missing or double-counting hours",
    start_date => {
      const start = DateTime.fromISO(start_date, { zone: "America/New_York" });
      const end = start.plus({ days: 3 });
      const params = { start_date, end_date: end.minus({ days: 1 }).toISODate()!, time_zone: "America/New_York" };
      const slices = planSessionRollups(params, zones, "day", now)!;
      const hours = coveredHours(slices);
      expect(hours).toHaveLength((end.toSeconds() - start.toSeconds()) / 3600);
      expect(new Set(hours).size).toBe(hours.length);
      expect(slices.every(slice => slice.resolution === "day")).toBe(true);
    }
  );

  it("preserves open lower and closed upper rolling bounds", () => {
    const end = Date.parse("2026-09-20T00:00:00Z");
    const slices = planSessionRollups(
      { past_minutes_start: 60 * 24 * 35, past_minutes_end: 0 },
      zones,
      undefined,
      end
    )!;
    const hours = coveredHours(slices);
    expect(hours[0]).toBe(end / 1000 - 35 * 86400 + 3600);
    expect(hours[hours.length - 1]).toBe(end / 1000);
    expect(hours).toHaveLength(35 * 24);
  });

  it("does not use monthly summaries for day or week charts", () => {
    for (const bucket of ["day", "week"] as const) {
      const slices = planSessionRollups({ start_date: "2026-01-01", end_date: "2026-03-31" }, zones, bucket, now)!;
      expect(slices.every(slice => slice.resolution === "day")).toBe(true);
    }
  });

  it("uses hourly summaries when the chart timezone was not precomputed", () => {
    const slices = planSessionRollups(
      { start_date: "2026-01-01", end_date: "2026-03-31", time_zone: "Asia/Tokyo" },
      zones,
      "day",
      now
    )!;
    expect(slices).toHaveLength(1);
    expect(slices[0].resolution).toBe("hour");
  });

  it("uses monthly summaries for all-time totals and daily ones for all-time day charts", () => {
    expect(planSessionRollups({}, zones, undefined, now)).toEqual([
      { resolution: "month", timeZone: "UTC", start: null, end: null },
    ]);
    expect(planSessionRollups({}, zones, "day", now)?.[0].resolution).toBe("day");
  });

  it("leaves exact datetime windows on the existing raw-events path", () => {
    expect(
      planSessionRollups(
        { start_datetime: "2026-01-01 00:30:00", end_datetime: "2026-02-01 00:45:00" },
        zones,
        undefined,
        now
      )
    ).toBeNull();
  });
});
