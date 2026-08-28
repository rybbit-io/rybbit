import { describe, expect, it, vi } from "vitest";

vi.mock("../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: vi.fn() },
}));

import { buildJourneysQuery } from "./getJourneys.js";

const baseQuery = (filters: string) => ({
  filters,
  start_date: "",
  end_date: "",
  time_zone: "UTC",
});

const filter = (parameter: string, value: string) => ({ parameter, type: "equals", value: [value] });

describe("buildJourneysQuery session-scoped filters", () => {
  it("keeps later journey pageviews when the referrer exists only on the acquisition row", () => {
    const sql = buildJourneysQuery(baseQuery(JSON.stringify([filter("referrer", "google.com")])), 1, {});

    expect(sql).toContain("FilteredSessions AS");
    expect(sql).toContain("argMinIf(referrer, timestamp, referrer != '') AS referrer");
    expect(sql).toContain("WHERE 1 = 1 AND domainWithoutWWW(referrer) = 'google.com'");
    expect(sql).toContain("FROM events\n            INNER JOIN FilteredSessions USING (session_id)");
    expect(sql).toContain("AND type = 'pageview'");
    expect(sql).toContain("SELECT count() FROM FilteredSessions");
    expect(sql.match(/domainWithoutWWW\(referrer\) = 'google\.com'/g)).toHaveLength(1);
  });

  it("allows campaign and a later pathname to qualify on different rows", () => {
    const filters = JSON.stringify([filter("utm_campaign", "recipe_book_2026"), filter("pathname", "/thank-you")]);
    const sql = buildJourneysQuery(baseQuery(filters), 1, {});

    expect(sql).toContain("WHERE 1 = 1 AND utm_campaign = 'recipe_book_2026'");
    expect(sql).toContain("SELECT DISTINCT session_id\n            FROM events");
    expect(sql).toContain("AND pathname = '/thank-you'");
    expect(sql.match(/utm_campaign = 'recipe_book_2026'/g)).toHaveLength(1);
    expect(sql.match(/pathname = '\/thank-you'/g)).toHaveLength(1);
  });
});
