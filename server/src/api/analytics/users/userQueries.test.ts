import { describe, expect, it, vi } from "vitest";

vi.mock("../../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: vi.fn() },
}));
vi.mock("../../../db/postgres/postgres.js", () => ({
  db: {},
}));

import { buildUserInfoQueries } from "./getUserInfo.js";
import { buildUserSessionCountQuery } from "./getUserSessionCount.js";
import { buildUsersQuery } from "./getUsers.js";

const CAMPAIGN = "recipe_book_2026";
const campaignFilter = { parameter: "utm_campaign", type: "equals", value: [CAMPAIGN] };
const pathnameFilter = { parameter: "pathname", type: "equals", value: ["/thank-you"] };

const baseQuery = (filters: string) => ({
  filters,
  start_date: "",
  end_date: "",
  time_zone: "UTC",
});

describe("user queries with session-scoped filters", () => {
  it("aggregates all user events after a landing-only campaign qualifies the session", () => {
    const query = baseQuery(JSON.stringify([campaignFilter]));
    const dataSql = buildUsersQuery(query, 1, null, false);
    const countSql = buildUsersQuery(query, 1, null, true);

    for (const sql of [dataSql, countSql]) {
      expect(sql).toContain("FilteredSessions AS");
      expect(sql).toContain("WHERE 1 = 1 AND utm_campaign = 'recipe_book_2026'");
      expect(sql).toContain("INNER JOIN FilteredSessions USING (session_id)");
      expect(sql.match(/utm_campaign = 'recipe_book_2026'/g)).toHaveLength(1);
    }

    expect(dataSql).toContain("countIf(type = 'pageview') AS pageviews");
    expect(dataSql).toContain("countIf(type = 'custom_event') AS events");
  });

  it("lets campaign and pathname filters match different rows for list and count", () => {
    const query = baseQuery(JSON.stringify([campaignFilter, pathnameFilter]));

    for (const sql of [buildUsersQuery(query, 1, null, false), buildUsersQuery(query, 1, null, true)]) {
      expect(sql).toContain("WHERE 1 = 1 AND utm_campaign = 'recipe_book_2026'");
      expect(sql).toContain("AND pathname = '/thank-you'");
      expect(sql).toContain("INNER JOIN FilteredSessions USING (session_id)");
      expect(sql.match(/utm_campaign = 'recipe_book_2026'/g)).toHaveLength(1);
      expect(sql.match(/pathname = '\/thank-you'/g)).toHaveLength(1);
    }
  });

  it("uses the same selected sessions for every user-detail panel", () => {
    const queries = buildUserInfoQueries(baseQuery(JSON.stringify([campaignFilter])), 1);

    for (const sql of Object.values(queries)) {
      expect(sql).toContain("FilteredSessions AS");
      expect(sql).toContain("WHERE 1 = 1 AND utm_campaign = 'recipe_book_2026'");
      expect(sql).toContain("INNER JOIN FilteredSessions USING (session_id)");
      expect(sql.match(/utm_campaign = 'recipe_book_2026'/g)).toHaveLength(1);
    }

    expect(queries.sessionsQuery).toContain("dateDiff('second', MIN(timestamp), MAX(timestamp)) AS session_duration");
    expect(queries.vitalsQuery).toContain("WHERE type = 'performance'");
  });

  it("counts compound-filtered sessions by their start date", () => {
    const sql = buildUserSessionCountQuery(
      {
        filters: JSON.stringify([campaignFilter, pathnameFilter]),
        time_zone: "America/New_York",
      },
      1
    );

    expect(sql).toContain("FilteredSessions AS");
    expect(sql).toContain("WHERE 1 = 1 AND utm_campaign = 'recipe_book_2026'");
    expect(sql).toContain("AND pathname = '/thank-you'");
    expect(sql).toContain("INNER JOIN FilteredSessions USING (session_id)");
    expect(sql).toContain("min(timestamp) AS session_start");
    expect(sql).toContain("toDate(session_start, 'America/New_York') as date");
    expect(sql).toContain("FROM UserSessions");
  });
});
