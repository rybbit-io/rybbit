import { describe, expect, it, vi } from "vitest";

vi.mock("../../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: vi.fn() },
}));
vi.mock("../../../db/postgres/postgres.js", () => ({
  db: {},
}));
// The segments handler reaches auth-utils through segmentAccess; these tests
// only build SQL, so keep the auth initializer out of them.
vi.mock("../../../lib/auth.js", () => ({ auth: { api: {} } }));

import {
  buildUserGoalsQuery,
  buildUserSessionGoalsQuery,
  MAX_SESSION_IDS,
  parseSessionIds,
  toGoalConditions,
} from "./getUserGoals.js";
import { buildUserRepeatedErrorQuery } from "./getUserRepeatedError.js";
import { buildUserSegmentsQuery } from "./getUserSegments.js";
import { buildUserSummaryQuery } from "./getUserSummary.js";

const USER_PREDICATE = "identified_user_id = {userId:String}";
const campaignFilter = { parameter: "utm_campaign", type: "equals", value: ["launch"] };
const pathnameFilter = { parameter: "pathname", type: "contains", value: ["/docs"] };

const range = (filters = "") => ({
  filters,
  start_date: "2026-09-01",
  end_date: "2026-09-30",
  time_zone: "Europe/Stockholm",
});
const allTime = (filters = "") => ({ filters, start_date: "", end_date: "", time_zone: "UTC" });

const goalRows = [
  { goalId: 3, goalType: "path", config: { pathPattern: "/pricing" } },
  { goalId: 7, goalType: "event", config: { eventName: "signup" } },
  // No event name: cannot be completed, so it never reaches the SQL.
  { goalId: 9, goalType: "event", config: {} },
];

// Every scan of `events` in a statement, with the WHERE clause that bounds it.
const eventScans = (sql: string) => sql.split(/FROM events\b/).slice(1);

describe("user summary query", () => {
  it("reads one user's sessions inside the window and counts active days in the request's timezone", () => {
    const sql = buildUserSummaryQuery(range(), 1);

    expect(sql).toContain(USER_PREDICATE);
    expect(sql).toContain("source_events.site_id = {site:Int32}");
    expect(sql).toContain("toDateTime('2026-09-01', 'Europe/Stockholm')");
    expect(sql).toContain("uniqExact(toDate(session_start, 'Europe/Stockholm')) AS active_days");
    expect(sql).toContain("if(count() = 0, 0, round(avg(session_duration))) AS duration");
    expect(sql).not.toContain("FilteredSessions");
  });

  it("applies the page's filters the way the profile summary does", () => {
    const sql = buildUserSummaryQuery(range(JSON.stringify([campaignFilter])), 1);

    expect(sql).toContain("FilteredSessions AS");
    expect(sql).toContain("INNER JOIN FilteredSessions USING (session_id)");
    expect(sql.match(/utm_campaign = 'launch'/g)).toHaveLength(1);
  });
});

describe("user goals queries", () => {
  const conditions = toGoalConditions(goalRows);

  it("skips goals that have no usable condition", () => {
    expect(conditions.map(condition => condition.goalId)).toEqual([3, 7]);
  });

  it("counts converting sessions and the latest completion per goal over one scan of the user's events", () => {
    const sql = buildUserGoalsQuery(range(), 1, conditions)!;

    expect(sql).toContain("AS goal_3_sessions");
    expect(sql).toContain("AS goal_3_last");
    expect(sql).toContain("AS goal_7_sessions");
    expect(sql).not.toContain("goal_9");
    expect(sql).toContain(USER_PREDICATE);
    expect(sql).toContain("toDateTime('2026-09-01', 'Europe/Stockholm')");
    expect(eventScans(sql)).toHaveLength(1);
  });

  it("has nothing to run for a site without goals", () => {
    expect(buildUserGoalsQuery(range(), 1, [])).toBeNull();
    expect(buildUserSessionGoalsQuery(range(), 1, [])).toBeNull();
  });

  it("limits the per-session lookup to the listed sessions of this user", () => {
    const sql = buildUserSessionGoalsQuery(range(), 1, conditions)!;

    expect(sql).toContain("WHERE session_id IN ({sessionIds:Array(String)})");
    expect(sql).toContain("GROUP BY session_id");
    expect(sql).toContain("AS goal_3");
    expect(sql).toContain("AS goal_7");
    expect(sql).toContain(USER_PREDICATE);
  });

  it("accepts only a bounded JSON array of session ids", () => {
    expect(parseSessionIds(JSON.stringify(["a", "b", "a"]))).toEqual(["a", "b"]);
    expect(parseSessionIds(undefined)).toBeNull();
    expect(parseSessionIds("not json")).toBeNull();
    expect(parseSessionIds(JSON.stringify([]))).toBeNull();
    expect(parseSessionIds(JSON.stringify([1, 2]))).toBeNull();
    expect(parseSessionIds(JSON.stringify("a"))).toBeNull();
    expect(parseSessionIds(JSON.stringify(Array.from({ length: MAX_SESSION_IDS + 1 }, (_, i) => `s${i}`)))).toBeNull();
  });
});

describe("user repeated error query", () => {
  it("returns the latest session in which one message was thrown at least twice", () => {
    const sql = buildUserRepeatedErrorQuery(range(), 1);

    expect(sql).toContain("type = 'error'");
    expect(sql).toContain("error_message,\n        session_id");
    expect(sql).toContain("occurrences >= 2");
    expect(sql).toContain("last_seen DESC");
    expect(sql).toContain("LIMIT 1");
    expect(sql).toContain(USER_PREDICATE);
    expect(sql).toContain("toDateTime('2026-09-01', 'Europe/Stockholm')");
  });
});

describe("user segments query", () => {
  const segments = [
    { segmentId: 4, filters: [campaignFilter] as never },
    { segmentId: 11, filters: [pathnameFilter] as never },
  ];

  it("counts each segment with its own session CTE and reports the user's total", () => {
    const built = buildUserSegmentsQuery(range(), 1, segments)!;

    expect(built.segmentIds).toEqual([4, 11]);
    expect(built.query).toContain("Segment_4 AS (");
    expect(built.query).toContain("Segment_11 AS (");
    expect(built.query).toContain("(SELECT count() FROM Segment_4) AS segment_4");
    expect(built.query).toContain("(SELECT count() FROM Segment_11) AS segment_11");
    expect(built.query).toContain("AS total_sessions");
  });

  it("bounds every scan, including the filters' own subqueries, to the user and the window", () => {
    const { query } = buildUserSegmentsQuery(range(), 1, segments)!;
    const scans = eventScans(query);

    // Two segment CTEs, the pathname subquery inside the second, and the total.
    expect(scans).toHaveLength(4);
    for (const scan of scans) {
      const where = scan.split(/GROUP BY|\)\s*AS total_sessions/)[0];
      expect(where).toContain(USER_PREDICATE);
      expect(where).toContain("toDateTime('2026-09-01', 'Europe/Stockholm')");
    }
  });

  it("stays well-formed on an all-time window, where there is no time predicate to lead with", () => {
    const { query } = buildUserSegmentsQuery(allTime(), 1, segments)!;

    expect(query).not.toMatch(/AND\s+AND/);
    expect(query).not.toMatch(/WHERE\s+AND/);
    for (const scan of eventScans(query)) {
      expect(scan).toContain(USER_PREDICATE);
    }
  });

  it("narrows each segment and the total by the page's own filters", () => {
    const country = { parameter: "country", type: "equals", value: ["SE"] };
    const { query } = buildUserSegmentsQuery(range(JSON.stringify([country])), 1, segments)!;

    expect(query).toContain("PageSessions AS (");
    expect(query).toContain("(SELECT count() FROM PageSessions) AS total_sessions");
    // Once in each segment and once in the total.
    expect(query.match(/country = 'SE'/g)).toHaveLength(3);
  });

  it("drops a segment whose stored filters cannot be compiled and keeps the rest", () => {
    const broken = { segmentId: 5, filters: [{ parameter: "pathname", type: "regex", value: ["(?=x)"] }] as never };
    const built = buildUserSegmentsQuery(range(), 1, [broken, segments[0]])!;

    expect(built.segmentIds).toEqual([4]);
    expect(built.query).not.toContain("Segment_5");
  });

  it("has nothing to run when no segment has filters", () => {
    expect(buildUserSegmentsQuery(range(), 1, [])).toBeNull();
    expect(buildUserSegmentsQuery(range(), 1, [{ segmentId: 2, filters: [] }])).toBeNull();
  });
});
