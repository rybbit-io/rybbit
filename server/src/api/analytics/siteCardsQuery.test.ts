import { describe, expect, it, vi } from "vitest";
import { buildSiteCardsQueries } from "./siteCardsQuery.js";
import { EFFECTIVE_SESSION_USER_ID } from "./utils/effectiveUserId.js";

const current = { past_minutes_start: 1440, past_minutes_end: 0, time_zone: "America/New_York" };
const comparison = { ...current, past_minutes_start: 2880, past_minutes_end: 1440 };
const now = Date.parse("2026-09-20T20:41:33Z");

describe("raw-event Site card queries", () => {
  it("scans events once per query for all requested sites, without materialized views", () => {
    const queries = buildSiteCardsQueries({ siteIds: [1, 2, 3], current, comparison, bucket: "hour" }, now);
    for (const spec of [queries.totals, queries.series]) {
      expect(spec.query.match(/FROM events/g)).toHaveLength(1);
      expect(spec.query).not.toMatch(/_mv_target|JOIN\s*\(/);
      expect(spec.params).toEqual({ siteIds: [1, 2, 3] });
      expect(spec.query).toContain("site_id IN {siteIds:Array(Int32)}");
    }
  });

  it("resolves identity per site, session AND period using the standard metric definition", () => {
    const { totals } = buildSiteCardsQueries({ siteIds: [1, 2], current, comparison, bucket: "hour" }, now);
    expect(totals.query).toContain(EFFECTIVE_SESSION_USER_ID);
    expect(totals.query).toContain("GROUP BY site_id, session_id, period");
    expect(totals.query).toContain("COUNT(DISTINCT if(period = 0, effective_user_id, NULL))");
    expect(totals.query).toContain("COUNT(DISTINCT if(period = 1, effective_user_id, NULL))");
  });

  it("allows an event to participate in both overlapping periods", () => {
    const { totals } = buildSiteCardsQueries({ siteIds: [1], current, comparison: current, bucket: "hour" }, now);
    expect(totals.query).toContain("[0, 1]");
    expect(totals.query).toContain("ARRAY JOIN");
  });

  it("does not scan a previous window when comparison is disabled", () => {
    const { totals } = buildSiteCardsQueries({ siteIds: [1], current, comparison: null, bucket: "hour" }, now);
    expect(totals.query).toContain("ARRAY JOIN [0] AS period");
    expect(totals.query).not.toContain("2026-09-18");
  });

  it("resolves relative bounds from a single clock across both queries", () => {
    const clock = vi.spyOn(Date, "now").mockReturnValue(now);
    try {
      const { totals, series } = buildSiteCardsQueries({ siteIds: [1], current, comparison, bucket: "hour" });
      expect(clock).toHaveBeenCalledTimes(1);
      expect(totals.query).toContain("timestamp <= toDateTime('2026-09-20 20:41:33', 'UTC')");
      expect(series.query).toContain("timestamp <= toDateTime('2026-09-20 20:41:33', 'UTC')");
    } finally {
      clock.mockRestore();
    }
  });

  it("retains event-only buckets for all-time charts without scanning events twice", () => {
    const { series, fillMissingBuckets } = buildSiteCardsQueries(
      { siteIds: [1], current: {}, comparison: null, bucket: "hour" },
      now
    );
    expect(fillMissingBuckets).toBe(false);
    expect(series.query).toContain("groupUniqArray");
    expect(series.query).toContain("countIf(active_bucket =");
    expect(series.query).not.toContain("WITH FILL");
    expect(series.query.match(/FROM events/g)).toHaveLength(1);
  });

  it("supports exact windows and sub-hour buckets without rounding the request", () => {
    const { series } = buildSiteCardsQueries(
      {
        siteIds: [1],
        comparison: null,
        bucket: "five_minutes",
        current: {
          start_datetime: "2026-09-18 10:32:00Z",
          end_datetime: "2026-09-18 11:17:00Z",
          time_zone: "Asia/Kolkata",
        },
      },
      now
    );
    expect(series.query).toContain("toStartOfFiveMinutes");
    expect(series.query).toContain("timestamp >= toDateTime('2026-09-18 10:32:00', 'UTC')");
    expect(series.query).toContain("timestamp < toDateTime('2026-09-18 11:17:00', 'UTC')");
  });
});
