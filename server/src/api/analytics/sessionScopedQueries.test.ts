import { describe, expect, it, vi } from "vitest";

vi.mock("../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: vi.fn() },
}));
vi.mock("../../db/postgres/postgres.js", () => ({
  db: {},
}));

import { buildErrorBucketedQuery } from "./getErrorBucketed.js";
import { buildErrorEventsQuery } from "./getErrorEvents.js";
import { buildErrorNamesQuery } from "./getErrorNames.js";
import { buildOverviewBucketedQuery } from "./getOverviewBucketed.js";
import { buildPageTitlesQuery } from "./getPageTitles.js";
import { buildPerformanceByDimensionQuery } from "./performance/getPerformanceByDimension.js";
import { buildPerformanceOverviewQuery } from "./performance/getPerformanceOverview.js";
import { buildPerformanceTimeSeriesQuery } from "./performance/getPerformanceTimeSeries.js";

const SITE_ID = 1;
const campaignFilter = JSON.stringify([{ parameter: "utm_campaign", type: "equals", value: ["recipe_book_2026"] }]);
const baseParams = {
  start_date: "2026-08-01",
  end_date: "2026-08-31",
  time_zone: "UTC",
  filters: campaignFilter,
};

const expectSessionQualifiedTarget = (sql: string, targetPredicate: string) => {
  expect(sql).toContain("FilteredSessions AS (");
  expect(sql).toContain("INNER JOIN FilteredSessions");

  const targetQuery = sql.slice(sql.lastIndexOf(targetPredicate));
  expect(targetQuery).not.toContain("url_parameters['utm_campaign']");
};

describe("session-qualified target-event analytics", () => {
  it("qualifies performance overview sessions before measuring performance rows", () => {
    const sql = buildPerformanceOverviewQuery(baseParams, SITE_ID);
    expectSessionQualifiedTarget(sql, "AND type = 'performance'");
  });

  it("keeps performance pathname filters on the measured row", () => {
    const pathFilter = JSON.stringify([{ parameter: "pathname", type: "equals", value: ["/pricing"] }]);
    const sql = buildPerformanceOverviewQuery({ ...baseParams, filters: pathFilter }, SITE_ID);

    expect(sql).toContain("AND pathname = '/pricing'");
    expect(sql).not.toContain("FilteredSessions AS (");
  });

  it("combines a campaign cohort with a measured performance path", () => {
    const filters = JSON.stringify([
      { parameter: "utm_campaign", type: "equals", value: ["launch"] },
      { parameter: "pathname", type: "equals", value: ["/pricing"] },
    ]);
    const sql = buildPerformanceOverviewQuery({ ...baseParams, filters }, SITE_ID);

    expect(sql).toContain("FilteredSessions AS (");
    expect(sql).toContain("INNER JOIN FilteredSessions USING (session_id)");
    expect(sql.slice(sql.lastIndexOf("AND type = 'performance'"))).toContain("AND pathname = '/pricing'");
  });

  it("qualifies performance time-series sessions before measuring performance rows", () => {
    const sql = buildPerformanceTimeSeriesQuery({ ...baseParams, bucket: "day" }, SITE_ID);
    expectSessionQualifiedTarget(sql, "AND type = 'performance'");
  });

  it("qualifies performance dimension sessions in data and count queries", () => {
    for (const isCountQuery of [false, true]) {
      const sql = buildPerformanceByDimensionQuery({ ...baseParams, dimension: "pathname" }, SITE_ID, isCountQuery);
      expectSessionQualifiedTarget(sql, "AND type = 'performance'");
    }
  });

  it("qualifies error-name sessions before measuring error rows", () => {
    const sql = buildErrorNamesQuery(baseParams, SITE_ID);
    expectSessionQualifiedTarget(sql, "AND type = 'error'");
  });

  it("keeps error pathname filters on the error row", () => {
    const pathFilter = JSON.stringify([{ parameter: "pathname", type: "equals", value: ["/checkout"] }]);
    const sql = buildErrorNamesQuery({ ...baseParams, filters: pathFilter }, SITE_ID);

    expect(sql).toContain("AND pathname = '/checkout'");
    expect(sql).not.toContain("FilteredSessions AS (");
  });

  it("qualifies error time-series sessions before measuring error rows", () => {
    const sql = buildErrorBucketedQuery({ ...baseParams, bucket: "day", errorMessage: "boom" }, SITE_ID);
    expectSessionQualifiedTarget(sql, "AND type = 'error'");
  });

  it("qualifies error-event sessions in data and count queries", () => {
    for (const isCountQuery of [false, true]) {
      const sql = buildErrorEventsQuery({ ...baseParams, errorMessage: "boom" }, SITE_ID, isCountQuery);
      expectSessionQualifiedTarget(sql, "AND type = 'error'");
    }
  });

  it("builds bucketed overview stats from all rows in qualifying sessions", () => {
    const sql = buildOverviewBucketedQuery({ ...baseParams, bucket: "day" }, SITE_ID);

    expect(sql).toContain("FilteredSessions AS (");
    expect(sql).toContain("INNER JOIN FilteredSessions");
    expect(sql.slice(sql.indexOf("SessionsWithStats AS ("))).not.toContain("url_parameters['utm_campaign']");
  });

  it("builds page-title metrics from all pageviews in qualifying sessions", () => {
    const sql = buildPageTitlesQuery(baseParams, SITE_ID);

    expect(sql).toContain("FilteredSessions AS (");
    expect(sql).toContain("INNER JOIN FilteredSessions USING (session_id)");
    expect(sql.slice(sql.indexOf("EventTimes AS ("))).not.toContain("url_parameters['utm_campaign']");
  });
});
