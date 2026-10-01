import { describe, expect, it, vi } from "vitest";

vi.mock("../../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: vi.fn() },
}));
vi.mock("../../../db/postgres/postgres.js", () => ({
  db: {},
}));

import { buildPerformanceByDimensionQuery } from "./getPerformanceByDimension.js";
import { buildPerformanceOverviewQuery } from "./getPerformanceOverview.js";
import {
  WEB_VITAL_LIMITS,
  WEB_VITAL_METRICS,
  WEB_VITAL_RATING_COLUMNS,
  webVitalRatingCounts,
} from "./webVitalRatings.js";

const SITE_ID = 1;
const baseParams = { start_date: "2026-09-01", end_date: "2026-09-30", time_zone: "UTC", filters: "[]" };

describe("web vital rating counts", () => {
  it("counts measured, good and poor loads for every metric", () => {
    const sql = webVitalRatingCounts();

    expect(WEB_VITAL_METRICS).toEqual(["lcp", "cls", "inp", "fcp", "ttfb"]);
    for (const metric of WEB_VITAL_METRICS) {
      const { good, poor } = WEB_VITAL_LIMITS[metric];
      expect(sql).toContain(`countIf(${metric} IS NOT NULL) AS ${metric}_count`);
      expect(sql).toContain(`countIf(${metric} IS NOT NULL AND ${metric} <= ${good}) AS ${metric}_good`);
      expect(sql).toContain(`countIf(${metric} IS NOT NULL AND ${metric} > ${poor}) AS ${metric}_poor`);
    }
  });

  it("uses Google's limits, with good below poor", () => {
    expect(WEB_VITAL_LIMITS).toEqual({
      lcp: { good: 2500, poor: 4000 },
      cls: { good: 0.1, poor: 0.25 },
      inp: { good: 200, poor: 500 },
      fcp: { good: 1800, poor: 3000 },
      ttfb: { good: 800, poor: 1800 },
    });
  });

  it("is part of the overview, next to the percentiles and the load count", () => {
    const sql = buildPerformanceOverviewQuery(baseParams, SITE_ID);

    expect(sql).toContain("quantile(0.75)(lcp) AS lcp_p75");
    expect(sql).toContain("countIf(lcp IS NOT NULL AND lcp <= 2500) AS lcp_good");
    expect(sql).toContain("countIf(cls IS NOT NULL AND cls > 0.25) AS cls_poor");
    expect(sql).toContain("COUNT(*) AS total_performance_events");
  });

  it("is computed per dimension value and returned with each row", () => {
    const sql = buildPerformanceByDimensionQuery({ ...baseParams, dimension: "pathname" }, SITE_ID, false);
    const [stats, outerSelect] = sql.split("FROM PerformanceStats").map(part => part.trim());

    expect(stats).toContain("countIf(inp IS NOT NULL AND inp <= 200) AS inp_good");
    expect(stats).toContain("GROUP BY pathname");
    // Every rating column the CTE computes is selected by the outer query.
    const selected = sql.slice(sql.lastIndexOf("SELECT"), sql.lastIndexOf("FROM PerformanceStats"));
    for (const column of WEB_VITAL_RATING_COLUMNS) {
      expect(selected).toContain(column);
    }
    expect(outerSelect).toContain("ORDER BY event_count DESC");
    expect(outerSelect).toContain("LIMIT 100");
  });

  it("leaves the count query a count", () => {
    const sql = buildPerformanceByDimensionQuery({ ...baseParams, dimension: "region" }, SITE_ID, true);

    expect(sql).toContain("SELECT COUNT(DISTINCT region) as totalCount FROM PerformanceStats");
    expect(sql).not.toContain("LIMIT");
  });

  it("bounds the previous-period lookup for the rows on screen", () => {
    const filters = JSON.stringify([{ parameter: "pathname", type: "equals", value: ["/pricing", "/demo"] }]);
    const sql = buildPerformanceByDimensionQuery(
      { ...baseParams, filters, dimension: "pathname", limit: 25 },
      SITE_ID,
      false
    );

    expect(sql).toContain("'/pricing'");
    expect(sql).toContain("'/demo'");
    expect(sql).toContain("LIMIT 25");
    // The measured path is a row-level filter: no session qualification needed.
    expect(sql).not.toContain("FilteredSessions AS (");
  });
});
