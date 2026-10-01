import { describe, expect, it, vi } from "vitest";

vi.mock("../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: vi.fn() },
}));

import { buildGeoBreakdownQuery, buildGeoBreakdownTotalsQuery } from "./getGeoBreakdown.js";

const baseQuery = (overrides: Partial<Record<string, unknown>> = {}) =>
  ({
    start_date: "",
    end_date: "",
    time_zone: "UTC",
    filters: "",
    level: "country",
    ...overrides,
  }) as Parameters<typeof buildGeoBreakdownQuery>[0];

const SITE_ID = 1;

describe("buildGeoBreakdownQuery", () => {
  it("attributes each session to the first country it was seen in", () => {
    const sql = buildGeoBreakdownQuery(baseQuery(), SITE_ID, "country", 250);

    expect(sql).toContain("argMinIf(country, timestamp, country <> '') AS value");
    expect(sql).toContain("GROUP BY session_id");
    expect(sql).toContain("WHERE value <> ''");
    expect(sql).toContain("ORDER BY sessions DESC, value ASC");
    expect(sql).toContain("LIMIT 250");
  });

  it("counts pageviews and bounces per session, not per matching row", () => {
    const sql = buildGeoBreakdownQuery(baseQuery(), SITE_ID, "country", 250);

    expect(sql).toContain("countIf(type = 'pageview') AS session_pageviews");
    expect(sql).toContain("sum(session_pageviews) AS pageviews");
    expect(sql).toContain("round(countIf(session_pageviews = 1) * 100 / count(), 2) AS bounce_rate");
    // The session CTE reads every event of the session: an event without a
    // place must still count towards the session's pageviews.
    expect(sql).not.toMatch(/site_id = \{siteId:Int32\}\s+AND country/);
  });

  it("counts users by identity when a session has one", () => {
    const sql = buildGeoBreakdownQuery(baseQuery(), SITE_ID, "country", 250);

    expect(sql).toContain("anyIf(identified_user_id, identified_user_id != '')");
    expect(sql).toContain("uniqExact(session_user_id) AS users");
  });

  it("uses the region-qualified city value the city filter expects, with coordinates", () => {
    const sql = buildGeoBreakdownQuery(baseQuery({ level: "city" }), SITE_ID, "city", 1000);

    expect(sql).toContain("argMinIf(concat(toString(region), '-', toString(city)), timestamp, city <> '') AS value");
    expect(sql).toContain("argMinIf(lat, timestamp, city <> '') AS lat");
    expect(sql).toContain("any(lon) AS lon");
    expect(sql).toContain("LIMIT 1000");
  });

  it("leaves coordinates out of the country and region levels", () => {
    expect(buildGeoBreakdownQuery(baseQuery(), SITE_ID, "country", 250)).not.toContain("lat");

    const regions = buildGeoBreakdownQuery(baseQuery({ level: "region" }), SITE_ID, "region", 5000);
    expect(regions).toContain("argMinIf(region, timestamp, region <> '') AS value");
    expect(regions).not.toContain("lat");
  });

  it("bounds the scan to the requested window", () => {
    const sql = buildGeoBreakdownQuery(
      baseQuery({ start_date: "2026-09-01", end_date: "2026-09-30" }),
      SITE_ID,
      "country",
      250
    );

    expect(sql).toContain("2026-09-01");
    expect(sql).toContain("2026-09-30");
  });

  it("applies filters to whole sessions", () => {
    const filters = JSON.stringify([
      { parameter: "utm_campaign", type: "equals", value: ["launch"] },
      { parameter: "pathname", type: "equals", value: ["/pricing"] },
    ]);
    const sql = buildGeoBreakdownQuery(baseQuery({ filters }), SITE_ID, "country", 250);

    expect(sql).toContain("FilteredSessions AS");
    expect(sql).toContain("INNER JOIN FilteredSessions USING (session_id)");
    expect(sql.match(/utm_campaign = 'launch'/g)).toHaveLength(1);
  });
});

describe("buildGeoBreakdownTotalsQuery", () => {
  it("totals every place, not only the rows the limit returns", () => {
    const sql = buildGeoBreakdownTotalsQuery(baseQuery(), SITE_ID, "country");

    expect(sql).toContain("uniqExact(value) AS places");
    expect(sql).toContain("uniqExact(session_user_id) AS users");
    expect(sql).toContain("nullIf(count(), 0)");
    expect(sql).not.toContain("LIMIT");
    expect(sql).not.toContain("GROUP BY value");
  });

  it("reads the same session rows as the breakdown", () => {
    const filters = JSON.stringify([{ parameter: "browser", type: "equals", value: ["Chrome"] }]);
    const rows = buildGeoBreakdownQuery(baseQuery({ filters }), SITE_ID, "country", 250);
    const totals = buildGeoBreakdownTotalsQuery(baseQuery({ filters }), SITE_ID, "country");
    const sessionData = (sql: string) => sql.slice(0, sql.indexOf("\nSELECT\n    "));

    expect(sessionData(rows)).toContain("SessionData AS");
    expect(sessionData(totals)).toBe(sessionData(rows));
  });
});
