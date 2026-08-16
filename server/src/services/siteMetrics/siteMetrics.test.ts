import { describe, expect, it, vi } from "vitest";

vi.mock("../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: vi.fn() },
}));
vi.mock("../../db/postgres/postgres.js", () => ({
  db: {},
}));

import { FilterParams } from "@rybbit/shared";
import { getTimeStatement } from "../../api/analytics/utils/utils.js";
import { buildOverviewQuery as buildDashboardOverviewQuery } from "../../api/analytics/getOverview.js";
import {
  BreakdownDimension,
  buildBreakdownQuery,
  buildMetricsSpec,
  buildMetricsSpecForWindow,
  buildOverviewQuery,
  SiteMetricsSpec,
} from "./siteMetrics.js";

const SITE_ID = 1;

/** How the dashboard route expresses its window: a date range plus a timezone. */
const DASHBOARD_PARAMS = {
  start_date: "2026-07-17",
  end_date: "2026-07-23",
  time_zone: "UTC",
  filters: "",
} as FilterParams;

/** How the PDF report expresses its window: the same builder, no HTTP request. */
const pdfSpec: SiteMetricsSpec = {
  timeStatement: getTimeStatement({ start_date: "2026-07-17", end_date: "2026-07-23", time_zone: "UTC" }),
  filterStatement: "",
};

/** How the weekly email expresses its window: an exact UTC datetime range. */
const weeklySpec: SiteMetricsSpec = {
  timeStatement: getTimeStatement({
    start_datetime: "2026-07-17 00:00:00",
    end_datetime: "2026-07-24 00:00:00",
  }),
};

/** Blanks out the one axis that legitimately differs between the three surfaces. */
const withoutTimeBound = (sql: string, spec: SiteMetricsSpec) =>
  sql.replace(spec.timeStatement, "<TIME>").replace(spec.timeStatement, "<TIME>");

describe("site metrics", () => {
  describe("one definition across all three surfaces", () => {
    it("gives the dashboard, the PDF report and the weekly email the same overview query", () => {
      const dashboard = withoutTimeBound(buildDashboardOverviewQuery(DASHBOARD_PARAMS, SITE_ID), {
        timeStatement: getTimeStatement(DASHBOARD_PARAMS),
      });
      const pdf = withoutTimeBound(buildOverviewQuery(pdfSpec), pdfSpec);
      const weekly = withoutTimeBound(buildOverviewQuery(weeklySpec), weeklySpec);

      expect(pdf).toBe(dashboard);
      expect(weekly).toBe(dashboard);
      expect(dashboard).not.toContain(getTimeStatement(DASHBOARD_PARAMS));
    });

    it("gives every surface the same breakdown query for a dimension", () => {
      const pdf = withoutTimeBound(buildBreakdownQuery("country", pdfSpec), pdfSpec);
      const weekly = withoutTimeBound(buildBreakdownQuery("country", weeklySpec), weeklySpec);

      expect(weekly).toBe(pdf);
    });
  });

  describe("buildOverviewQuery", () => {
    it("counts users by identity, falling back to the device fingerprint", () => {
      const sql = buildOverviewQuery(pdfSpec);

      expect(sql).toContain("COUNT(DISTINCT f.effective_user_id) AS users");
      expect(sql).toContain("anyIf(identified_user_id, identified_user_id != '')");
      expect(sql).toContain("anyLast(user_id)");
    });

    it("resolves the identity once per session rather than per event", () => {
      const sql = buildOverviewQuery(pdfSpec);

      // The identity expression must sit inside the session-grouped CTE, so a
      // visitor whose first pageview predates identify() still counts once.
      const sessionCteBody = sql.split("FilteredSessionsWithStats AS (")[1].split("GROUP BY session_id")[0];
      expect(sessionCteBody).toContain("anyIf(identified_user_id");
    });

    it("never aliases the identity back onto user_id", () => {
      // Shadowing a column with an alias used inside its own expression is a
      // cyclic-alias error in ClickHouse.
      expect(buildOverviewQuery(pdfSpec)).not.toMatch(/anyLast\(user_id\)\) AS user_id/);
    });

    it("reports bounce rate as a percentage of the session's full pageview count", () => {
      const sql = buildOverviewQuery({ timeStatement: "", filterStatement: "AND browser = 'Chrome'" });

      // A session that saw three pages is not a bounce because a filter hid two
      // of them, so the bounce test reads the unfiltered CTE.
      expect(sql).toContain("sumIf(1, asp.total_pageviews_in_session = 1) / COUNT() * 100 AS bounce_rate");
      const unfilteredCte = sql.split("AllSessionPageviews AS (")[1].split(")")[0];
      expect(unfilteredCte).not.toContain("browser = 'Chrome'");
    });

    it("applies the filter to the session, pageview and user counts", () => {
      const sql = buildOverviewQuery({ timeStatement: "", filterStatement: "AND browser = 'Chrome'" });
      const filteredCte = sql.split("FilteredSessionsWithStats AS (")[1];

      expect(filteredCte).toContain("browser = 'Chrome'");
    });
  });

  describe("buildBreakdownQuery", () => {
    const DIMENSION_COLUMNS: Record<BreakdownDimension, string> = {
      browser: "browser",
      city: "city",
      country: "country",
      device_type: "device_type",
      operating_system: "operating_system",
      pathname: "pathname",
      referrer: "domainWithoutWWW(referrer)",
      region: "region",
    };

    it.each(Object.entries(DIMENSION_COLUMNS))("breaks down by %s", (dimension, column) => {
      const sql = buildBreakdownQuery(dimension as BreakdownDimension, pdfSpec);

      expect(sql).toContain(`${column} AS value`);
      expect(sql).toContain("COUNT(DISTINCT session_id) AS unique_sessions");
      expect(sql).toContain("LIMIT {limit:Int32}");
      expect(sql).toContain(pdfSpec.timeStatement);
    });

    it("counts a page only where it was viewed", () => {
      expect(buildBreakdownQuery("pathname", pdfSpec)).toContain("AND type = 'pageview'");
    });

    it("does not restrict session properties to pageview events", () => {
      expect(buildBreakdownQuery("country", pdfSpec)).not.toContain("type = 'pageview'");
    });

    it("ranks ties deterministically so paged and repeated reports agree", () => {
      expect(buildBreakdownQuery("country", pdfSpec)).toContain("ORDER BY count DESC, value ASC");
    });

    it("carries the caller's filters into the breakdown", () => {
      const sql = buildBreakdownQuery("country", { timeStatement: "", filterStatement: "AND browser = 'Chrome'" });

      expect(sql).toContain("browser = 'Chrome'");
    });
  });

  describe("buildMetricsSpec", () => {
    it("derives both the window and the filters from HTTP query params", () => {
      const spec = buildMetricsSpec(
        { ...DASHBOARD_PARAMS, filters: JSON.stringify([{ parameter: "browser", type: "equals", value: ["Chrome"] }]) },
        SITE_ID
      );

      expect(spec.timeStatement).toContain("2026-07-17");
      expect(spec.filterStatement).toContain("Chrome");
    });

    it("bounds a session-level filter's subquery to the spec's own window", () => {
      // event_name filters compile to `session_id IN (SELECT … FROM events …)`.
      // An unbounded subquery qualifies a session on an event fired outside the
      // period being reported — and scans the Site's whole history to do it.
      const eventFilter = JSON.stringify([{ parameter: "event_name", type: "equals", value: ["signup"] }]);
      const spec = buildMetricsSpecForWindow(eventFilter, SITE_ID, pdfSpec.timeStatement);

      expect(spec.filterStatement).toContain("session_id IN (");
      expect(spec.filterStatement).toContain("2026-07-17");
    });

    it("scopes each period's filters to that period, so growth comparisons are fair", () => {
      const eventFilter = JSON.stringify([{ parameter: "event_name", type: "equals", value: ["signup"] }]);
      const current = buildMetricsSpecForWindow(eventFilter, SITE_ID, getTimeStatement(DASHBOARD_PARAMS));
      const previous = buildMetricsSpecForWindow(
        eventFilter,
        SITE_ID,
        getTimeStatement({ start_date: "2026-07-10", end_date: "2026-07-16", time_zone: "UTC" })
      );

      expect(current.filterStatement).toContain("2026-07-17");
      expect(previous.filterStatement).toContain("2026-07-10");
      expect(previous.filterStatement).not.toContain("2026-07-23");
    });
  });
});
