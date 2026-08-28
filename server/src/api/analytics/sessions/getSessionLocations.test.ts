import { describe, expect, it, vi } from "vitest";

vi.mock("../../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: vi.fn() },
}));

import { buildSessionLocationsQuery } from "./getSessionLocations.js";

describe("buildSessionLocationsQuery session-scoped filters", () => {
  it("keeps a session whose campaign and pathname occur on different rows", () => {
    const filters = JSON.stringify([
      { parameter: "utm_campaign", type: "equals", value: ["recipe_book_2026"] },
      { parameter: "pathname", type: "equals", value: ["/thank-you"] },
    ]);
    const sql = buildSessionLocationsQuery({ filters, start_date: "", end_date: "", time_zone: "UTC" }, 1);

    expect(sql).toContain("FilteredSessions AS");
    expect(sql).toContain("WHERE 1 = 1 AND utm_campaign = 'recipe_book_2026'");
    expect(sql).toContain("AND pathname = '/thank-you'");
    expect(sql).toContain("INNER JOIN FilteredSessions USING (session_id)");
    expect(sql).toContain("argMax(lat, timestamp) AS lat");
    expect(sql.match(/utm_campaign = 'recipe_book_2026'/g)).toHaveLength(1);
    expect(sql.match(/pathname = '\/thank-you'/g)).toHaveLength(1);
  });
});
