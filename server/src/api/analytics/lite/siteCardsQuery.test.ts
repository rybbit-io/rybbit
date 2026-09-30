import { describe, expect, it, vi } from "vitest";
import { buildSiteCardsQueries } from "./siteCardsQuery.js";

const siteIds = [1, 2, 3];
const current = { past_minutes_start: 1440, past_minutes_end: 0, time_zone: "America/New_York" };
const comparison = { ...current, past_minutes_start: 2880, past_minutes_end: 1440 };
const calendarCurrent = { start_date: "2026-09-19", end_date: "2026-09-20", time_zone: "America/New_York" };
const now = Date.parse("2026-09-20T20:41:33Z");

describe("Site card queries", () => {
  it("resolves adjacent rolling periods from one instant, regardless of query construction time", () => {
    const clock = vi.spyOn(Date, "now").mockReturnValue(now + 3600_000);
    try {
      const { totals, series } = buildSiteCardsQueries({ siteIds, current, comparison, bucket: "hour" }, now);
      expect(totals.query).toContain("timestamp > toDateTime('2026-09-18 20:41:33', 'UTC')");
      expect(totals.query).toContain("timestamp <= toDateTime('2026-09-19 20:41:33', 'UTC')");
      expect(totals.query).toContain("timestamp > toDateTime('2026-09-19 20:41:33', 'UTC')");
      expect(series.query).toContain("timestamp <= toDateTime('2026-09-20 20:41:33', 'UTC')");
      expect(totals.query).toContain("FROM events");
      expect(clock).not.toHaveBeenCalled();
    } finally {
      clock.mockRestore();
    }
  });

  it("bounds both aggregates independently so overlapping or nonadjacent comparisons work", () => {
    const { totals } = buildSiteCardsQueries(
      {
        siteIds,
        current,
        comparison: { ...comparison, past_minutes_start: 4320, past_minutes_end: 720 },
        bucket: "hour",
      },
      now
    );
    expect(totals.query).toContain("COUNT(DISTINCT if(period = 0, effective_user_id, NULL)) AS current_users");
    expect(totals.query).toContain("COUNT(DISTINCT if(period = 1, effective_user_id, NULL)) AS previous_users");
    expect(totals.query).toContain("ARRAY JOIN");
    expect(totals.query).toContain("2026-09-17 20:41:33");
    expect(totals.query).toContain("2026-09-20 08:41:33");
  });

  it("includes site_id in session deduplication and avoids work the sparkline does not display", () => {
    const { series } = buildSiteCardsQueries({ siteIds, current, comparison, bucket: "hour" }, now);
    expect(series.query).toContain("GROUP BY site_id, session_id");
    expect(series.query).toContain("min(timestamp) AS session_start");
    expect(series.query).toContain("WITH FILL");
    expect(series.query).not.toMatch(/JOIN|uniqMerge|pageviews|end_time/);
    expect(series.params).toEqual({ siteIds });
  });

  it.each(["day", "week", "month", "year"] as const)("keeps %s charts on the hourly rollup", bucket => {
    const { series } = buildSiteCardsQueries({ siteIds, current: calendarCurrent, comparison: null, bucket }, now);
    expect(series.query).toContain("FROM session_hourly_mv_target");
    expect(series.query).not.toContain("FROM sessions_mv_target");
    expect(series.query).toContain("sum(sessions)");
  });

  it("promotes minute buckets to hour, matching the existing lite chart", () => {
    const args = { siteIds, current: calendarCurrent, comparison: null };
    expect(buildSiteCardsQueries({ ...args, bucket: "minute" }, now)).toEqual(
      buildSiteCardsQueries({ ...args, bucket: "hour" }, now)
    );
  });

  it("keeps all-time unbounded and unfilled without inventing a comparison", () => {
    const { totals, series } = buildSiteCardsQueries({ siteIds, current: {}, comparison: null, bucket: "month" }, now);
    expect(totals.query).toContain("sumIf(sessions, 0) AS previous_sessions");
    expect(series.query).not.toContain("WITH FILL");
    expect(series.query).not.toContain("session_hour >");
  });
});
