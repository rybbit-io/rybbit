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
    expect(dataSql).toContain("min(timestamp) AS first_seen");
    expect(dataSql).not.toContain("LifetimeFirstSeen");
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
    expect(queries.sessionsQuery).toContain("MIN(session_start) AS first_seen");
    expect(queries.vitalsQuery).toContain("WHERE type = 'performance'");
  });

  it("keeps first_seen on the user's full history when a date range is selected", () => {
    const ranged = {
      filters: "",
      start_date: "2026-09-20",
      end_date: "2026-09-25",
      time_zone: "UTC",
    };

    const dataSql = buildUsersQuery(ranged, 1, null, false);
    const countSql = buildUsersQuery(ranged, 1, null, true);
    const lifetimeAt = dataSql.indexOf("LifetimeFirstSeen AS");

    expect(lifetimeAt).toBeGreaterThan(0);
    expect(dataSql.slice(0, lifetimeAt)).toContain("'2026-09-20'");
    expect(dataSql.slice(0, lifetimeAt)).not.toContain("min(timestamp) AS first_seen");
    expect(dataSql.slice(lifetimeAt)).toContain("min(timestamp) AS first_seen");
    expect(dataSql.slice(lifetimeAt)).not.toContain("2026-09-20");
    expect(dataSql).toContain("max(timestamp) AS last_seen");
    expect(dataSql).toContain("FROM PageUsers AS page");
    expect(countSql).not.toContain("LifetimeFirstSeen");

    const sortedByFirstSeen = buildUsersQuery({ ...ranged, sort_by: "first_seen", sort_order: "asc" }, 1, null, false);
    expect(sortedByFirstSeen).toContain("FROM QualifiedUsers");
    expect(sortedByFirstSeen).toContain("ORDER BY lifetime.first_seen ASC");
    expect(sortedByFirstSeen.indexOf("LIMIT {limit:Int32}")).toBeGreaterThan(
      sortedByFirstSeen.indexOf("LifetimeFirstSeen AS")
    );

    const sessionsSql = buildUserInfoQueries(ranged, 1).sessionsQuery;
    const firstSeenAt = sessionsSql.indexOf("SELECT min(lifetime_events.timestamp)");
    const firstSeenEnd = sessionsSql.indexOf(") AS first_seen");

    expect(firstSeenAt).toBeGreaterThan(0);
    expect(sessionsSql.slice(0, firstSeenAt)).toContain("'2026-09-20'");
    expect(sessionsSql.slice(firstSeenAt, firstSeenEnd)).not.toContain("2026-09-20");
    expect(sessionsSql).toContain("MAX(session_end) AS last_seen");
    expect(sessionsSql).not.toContain("MIN(session_start) AS first_seen");
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
