import { describe, expect, it, vi } from "vitest";

const query = vi.fn();
vi.mock("../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: (...args: unknown[]) => query(...args) },
}));

import {
  buildRetentionQuery,
  buildRetentionQueryParams,
  getRetention,
  MAX_COHORTS,
  processRetentionData,
  resolveRetentionWindow,
  RETENTION_LOOKBACK_DAYS,
} from "./getRetention.js";

// Wednesday Sep 30, 2026, 11:00 in New York.
const NOW = Date.parse("2026-09-30T15:00:00Z");
const NY = "America/New_York";

describe("resolveRetentionWindow", () => {
  it("lays Monday-start weeks over a date range and ends a range that includes today at now", () => {
    const window = resolveRetentionWindow(
      { start_date: "2026-08-03", end_date: "2026-09-30", time_zone: NY },
      "week",
      NOW
    );

    expect(window.periods).toEqual([
      "2026-08-03",
      "2026-08-10",
      "2026-08-17",
      "2026-08-24",
      "2026-08-31",
      "2026-09-07",
      "2026-09-14",
      "2026-09-21",
      "2026-09-28",
    ]);
    expect(window.start.toUTC().toISO()).toBe("2026-08-03T04:00:00.000Z");
    expect(window.end.toMillis()).toBe(NOW);
    expect(window.firstPeriodPartial).toBe(false);
    // The week of Sep 28 has only reached Wednesday: in progress, not a drop.
    expect(window.lastPeriodPartial).toBe(true);
    expect(window.endsAtNow).toBe(true);
    expect(window.truncated).toBe(false);
  });

  it("marks cohorts cut by a range that starts and ends mid-week", () => {
    const window = resolveRetentionWindow(
      { start_date: "2026-08-05", end_date: "2026-08-20", time_zone: NY },
      "week",
      NOW
    );

    expect(window.periods).toEqual(["2026-08-03", "2026-08-10", "2026-08-17"]);
    expect(window.firstPeriodPartial).toBe(true);
    expect(window.lastPeriodPartial).toBe(true);
    // Cut by the range, not still going on.
    expect(window.endsAtNow).toBe(false);
    expect(window.end.toUTC().toISO()).toBe("2026-08-21T04:00:00.000Z");
  });

  it("treats a past range that ends on a period boundary as complete", () => {
    const window = resolveRetentionWindow(
      { start_date: "2026-08-03", end_date: "2026-08-16", time_zone: "UTC" },
      "week",
      NOW
    );

    expect(window.periods).toEqual(["2026-08-03", "2026-08-10"]);
    expect(window.lastPeriodPartial).toBe(false);
  });

  it("keeps the latest periods of a window longer than the cohort cap", () => {
    const window = resolveRetentionWindow(
      { start_date: "2026-01-01", end_date: "2026-09-30", time_zone: "UTC" },
      "day",
      NOW
    );

    expect(window.periods).toHaveLength(MAX_COHORTS.day);
    expect(window.periods[window.periods.length - 1]).toBe("2026-09-30");
    expect(window.truncated).toBe(true);
    expect(window.firstPeriodPartial).toBe(false);
  });

  it("reads the dashboard's empty date range as all time, capped", () => {
    const window = resolveRetentionWindow({ start_date: "", end_date: "", time_zone: "UTC" }, "week", NOW);

    expect(window.periods).toHaveLength(MAX_COHORTS.week);
    expect(window.periods[window.periods.length - 1]).toBe("2026-09-28");
    expect(window.truncated).toBe(true);
  });

  it("answers the legacy range param, clamped to 7 to 365 days", () => {
    expect(resolveRetentionWindow({ range: "60" }, "day", NOW).start.toISODate()).toBe("2026-08-01");
    expect(resolveRetentionWindow({ range: "2" }, "day", NOW).start.toISODate()).toBe("2026-09-23");
  });

  it("defaults to the last 90 days when the request names no window", () => {
    const window = resolveRetentionWindow({}, "week", NOW);
    expect(window.start.toISODate()).toBe("2026-07-02");
    expect(window.end.toMillis()).toBe(NOW);
  });

  it("uses datetime and past-minutes windows as given", () => {
    const datetime = resolveRetentionWindow(
      { start_datetime: "2026-09-01 00:00:00", end_datetime: "2026-09-08 00:00:00", time_zone: "UTC" },
      "day",
      NOW
    );
    expect(datetime.periods).toHaveLength(7);

    const pastMinutes = resolveRetentionWindow({ past_minutes_start: "1440", past_minutes_end: "0" }, "day", NOW);
    expect(pastMinutes.periods).toEqual(["2026-09-29", "2026-09-30"]);
  });

  it("returns no periods for a window entirely in the future", () => {
    const window = resolveRetentionWindow(
      { start_date: "2026-10-05", end_date: "2026-10-10", time_zone: "UTC" },
      "day",
      NOW
    );
    expect(window.periods).toEqual([]);
  });
});

describe("buildRetentionQuery", () => {
  const window = resolveRetentionWindow(
    { start_date: "2026-08-03", end_date: "2026-09-30", time_zone: NY },
    "week",
    NOW
  );

  it("scans the window plus a bounded lookback, and drops users seen during it", () => {
    const sql = buildRetentionQuery(window, undefined, 1);

    expect(sql).toContain("AND timestamp >= toDateTime('2026-05-05 04:00:00', 'UTC')");
    expect(sql).toContain("AND timestamp < toDateTime('2026-09-30 15:00:00', 'UTC')");
    expect(sql).toContain("HAVING earlier_events = 0");
    expect(sql).toContain("COALESCE(NULLIF(identified_user_id, ''), user_id) AS effective_user_id");
    expect(sql).toContain("toStartOfWeek(timestamp, 1, {timeZone:String})");
    expect(sql).toContain("intDiv(dateDiff('day', cohort_period, activity_period), 7) AS period_difference");
    expect(sql).toContain("LIMIT {rowLimit:UInt32}");
    expect(sql).not.toContain("FilteredSessions");
    expect(RETENTION_LOOKBACK_DAYS).toBe(90);
  });

  it("selects cohorts by their first session when filters are set", () => {
    const filters = JSON.stringify([{ parameter: "country", type: "equals", value: ["US"] }]);
    const sql = buildRetentionQuery(window, filters, 1);

    expect(sql).toContain("FilteredSessions AS");
    expect(sql).toContain("WHERE first_session_id IN (SELECT session_id FROM FilteredSessions)");
    // The filter CTE covers the window only, not the lookback.
    expect(sql).toContain("AND timestamp >= toDateTime('2026-08-03 04:00:00', 'UTC')");
    expect(sql.match(/country = 'US'/g)).toHaveLength(1);
  });

  it("counts days in the window's timezone", () => {
    const daily = resolveRetentionWindow(
      { start_date: "2026-09-01", end_date: "2026-09-30", time_zone: NY },
      "day",
      NOW
    );
    const sql = buildRetentionQuery(daily, undefined, 1);

    expect(sql).toContain("toDate(timestamp, {timeZone:String})");
    expect(sql).toContain("dateDiff('day', cohort_period, activity_period) AS period_difference");
  });

  it("binds the timezone, window start and a triangle-sized row limit as parameters", () => {
    expect(buildRetentionQueryParams(window, 7)).toEqual({
      siteId: 7,
      timeZone: NY,
      windowStart: "2026-08-03 04:00:00",
      rowLimit: (MAX_COHORTS.week * (MAX_COHORTS.week + 1)) / 2,
    });
  });
});

describe("processRetentionData", () => {
  const periods = ["2026-08-03", "2026-08-10", "2026-08-17"];

  it("keeps retained user counts and fills unobserved returns with 0 inside the triangle", () => {
    const cohorts = processRetentionData(
      [
        { cohort_period: "2026-08-03", period_difference: 0, retained_users: 4 },
        { cohort_period: "2026-08-03", period_difference: 2, retained_users: 1 },
        { cohort_period: "2026-08-10", period_difference: 0, retained_users: 3 },
        { cohort_period: "2026-08-10", period_difference: 1, retained_users: 1 },
      ],
      periods
    );

    expect(cohorts["2026-08-03"]).toEqual({ size: 4, counts: [4, 0, 1], percentages: [100, 0, 25] });
    expect(cohorts["2026-08-10"]).toEqual({ size: 3, counts: [3, 1, null], percentages: [100, 33.33, null] });
    expect(cohorts["2026-08-17"]).toBeUndefined();
    expect(Object.keys(cohorts)).toEqual(["2026-08-03", "2026-08-10"]);
  });

  it("ignores rows outside the window's periods", () => {
    const cohorts = processRetentionData(
      [
        { cohort_period: "2026-07-27", period_difference: 0, retained_users: 9 },
        { cohort_period: "2026-08-17", period_difference: 0, retained_users: 2 },
        { cohort_period: "2026-08-17", period_difference: 1, retained_users: 2 },
      ],
      periods
    );

    expect(cohorts).toEqual({ "2026-08-17": { size: 2, counts: [2, null, null], percentages: [100, null, null] } });
  });
});

describe("getRetention", () => {
  const reply = () => {
    const res = { statusCode: 200, body: undefined as unknown };
    return Object.assign(res, {
      status(code: number) {
        res.statusCode = code;
        return this;
      },
      send(body: unknown) {
        res.body = body;
        return this;
      },
    });
  };
  const request = (querystring: Record<string, unknown>) =>
    ({ params: { siteId: "1" }, query: querystring, log: { error: vi.fn(), debug: vi.fn() } }) as any;

  it("rejects an unknown mode", async () => {
    const res = reply();
    await getRetention(request({ mode: "month" }), res as any);
    expect(res.statusCode).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  it("returns the window's shape without querying when it holds no periods", async () => {
    const res = reply();
    await getRetention(
      request({ mode: "day", start_date: "2999-01-01", end_date: "2999-01-02", time_zone: "UTC" }),
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(query).not.toHaveBeenCalled();
    expect(res.body).toMatchObject({ data: { cohorts: {}, periods: [], maxPeriods: 0, mode: "day" } });
  });

  it("queries with bound parameters and returns counts alongside percentages", async () => {
    query.mockResolvedValueOnce({
      json: async () => [
        { cohort_period: "2026-09-28", period_difference: "0", retained_users: "5" },
        { cohort_period: "2026-09-28", period_difference: "1", retained_users: "2" },
      ],
    });
    const res = reply();
    await getRetention(
      request({ mode: "week", start_date: "2026-09-28", end_date: "2026-10-11", time_zone: "UTC" }),
      res as any
    );

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0].query_params).toMatchObject({ siteId: 1, timeZone: "UTC" });
    const body = res.body as { data: { cohorts: Record<string, unknown>; lookbackDays: number } };
    expect(body.data.lookbackDays).toBe(RETENTION_LOOKBACK_DAYS);
    expect(Object.values(body.data.cohorts)[0]).toMatchObject({ size: 5 });
  });
});
