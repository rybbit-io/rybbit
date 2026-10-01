import { describe, expect, it, vi } from "vitest";

vi.mock("../../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: vi.fn() },
}));
vi.mock("../../../db/postgres/postgres.js", () => ({
  db: {},
}));

import { groupByTraitValue } from "./getUserTraitBreakdown.js";
import { buildUsersQuery } from "./getUsers.js";
import { buildUsersSummaryQuery, powerUserThreshold, summarizeUsers } from "./getUsersSummary.js";
import {
  buildCohortQuery,
  buildUserNarrowing,
  CohortRow,
  getLookbackParams,
  userNarrowingSchema,
} from "./userScope.js";

const base = { filters: "", start_date: "2026-09-01", end_date: "2026-09-30", time_zone: "Europe/Berlin" };
const allTime = { filters: "", start_date: "", end_date: "", time_zone: "UTC" };

describe("getLookbackParams", () => {
  it("ends a date range's lookback on the day before the period starts", () => {
    expect(getLookbackParams(base, 90)).toEqual({
      start_date: "2026-06-03",
      end_date: "2026-08-31",
      time_zone: "Europe/Berlin",
    });
  });

  it("ends a datetime range's lookback at the instant the period starts", () => {
    expect(
      getLookbackParams(
        { start_datetime: "2026-09-10T12:00:00Z", end_datetime: "2026-09-11T12:00:00Z", time_zone: "UTC" },
        30
      )
    ).toEqual({ start_datetime: "2026-08-11 12:00:00", end_datetime: "2026-09-10 12:00:00", time_zone: "UTC" });
  });

  it("moves a past-minutes window back by whole days", () => {
    expect(getLookbackParams({ past_minutes_start: 60, past_minutes_end: 0, time_zone: "UTC" }, 1)).toEqual({
      past_minutes_start: 1500,
      past_minutes_end: 60,
      time_zone: "UTC",
    });
  });

  it("has no lookback for an all-time or unusable window", () => {
    expect(getLookbackParams(allTime)).toBeNull();
    expect(getLookbackParams({ start_date: "not-a-date", end_date: "2026-09-30", time_zone: "UTC" })).toBeNull();
    expect(getLookbackParams({ ...base, time_zone: "Nowhere/Invalid" })).toBeNull();
  });
});

describe("userNarrowingSchema", () => {
  it("accepts the Users page's params and coerces the session floor", () => {
    const parsed = userNarrowingSchema.parse({ ...base, new_only: "true", min_sessions: "4", trait_key: "plan" });
    expect(parsed).toMatchObject({ new_only: "true", min_sessions: 4, trait_key: "plan" });
  });

  it.each([
    { min_sessions: "0" },
    { min_sessions: "1; DROP TABLE events" },
    { new_only: "yes" },
    { trait_key: "" },
    { search: "x".repeat(201) },
  ])("rejects %o", params => {
    expect(userNarrowingSchema.safeParse(params).success).toBe(false);
  });
});

describe("buildUserNarrowing", () => {
  it("adds nothing for a plain request", () => {
    expect(buildUserNarrowing(base)).toEqual({
      eventConditions: "",
      userConditions: "",
      needsUserAggregate: false,
      params: {},
    });
  });

  it("binds every value instead of interpolating it", () => {
    const hostile = "'; DROP TABLE events; --";
    const narrowing = buildUserNarrowing(
      { ...base, search: hostile, search_field: "user_id", min_sessions: "3" },
      { matchingUserIds: [hostile], excludedUserIds: [hostile] }
    );

    const sql = narrowing.eventConditions + narrowing.userConditions;
    expect(sql).not.toContain("DROP TABLE");
    expect(sql).toContain("{matchingUserIds:Array(String)}");
    expect(sql).toContain("{excludedUserIds:Array(String)}");
    expect(sql).toContain("{userIdSearch:String}");
    expect(sql).toContain("{minSessions:UInt32}");
    expect(narrowing.params).toEqual({
      matchingUserIds: [hostile],
      excludedUserIds: [hostile],
      userIdSearch: hostile,
      minSessions: 3,
    });
  });

  it("searches ids in ClickHouse only for the user-id field", () => {
    expect(buildUserNarrowing({ ...base, search: "mara", search_field: "name" }).eventConditions).toBe("");
    expect(buildUserNarrowing({ ...base, search: " a1d7 ", search_field: "user_id" })).toMatchObject({
      params: { userIdSearch: "a1d7" },
      userConditions: "",
    });
  });

  it("treats Postgres-resolved ids as identified without the flag", () => {
    expect(buildUserNarrowing(base, { matchingUserIds: ["u1"] }).userConditions).toBe("AND identified_user_id != ''");
    expect(buildUserNarrowing(base, { excludedUserIds: ["u1"] }).userConditions).toBe("");
  });

  it("bounds the new-user lookback to the period and the window before it", () => {
    const { userConditions, needsUserAggregate } = buildUserNarrowing({ ...base, new_only: "true" });

    expect(needsUserAggregate).toBe(true);
    expect(userConditions).toContain("AND effective_user_id NOT IN (");
    expect(userConditions).toContain("toDateTime('2026-06-03', 'Europe/Berlin')");
    expect(userConditions).toContain("toDateTime('2026-08-31', 'Europe/Berlin')");
    expect(userConditions).toContain("toDateTime('2026-09-01', 'Europe/Berlin')");
    expect(userConditions.match(/site_id = \{siteId:Int32\}/g)).toHaveLength(2);
  });

  it("drops the new-user condition for all time, where everyone is new", () => {
    expect(buildUserNarrowing({ ...allTime, new_only: "true" })).toMatchObject({
      userConditions: "",
      needsUserAggregate: false,
    });
  });
});

describe("users list with narrowing", () => {
  it("keeps the cheap count when nothing needs per-user rows", () => {
    const count = buildUsersQuery({ ...base, identified_only: "true" }, 1, null, true);
    expect(count).toContain("SELECT DISTINCT identified_user_id");
    expect(count).not.toContain("GROUP BY effective_user_id");
  });

  it("counts per-user rows when a quick filter reads them, with the list's own conditions", () => {
    const query = { ...base, min_sessions: "5", new_only: "true", identified_only: "true" };
    const list = buildUsersQuery(query, 1, null, false);
    const count = buildUsersQuery(query, 1, null, true);

    for (const sql of [list, count]) {
      expect(sql).toContain("GROUP BY");
      expect(sql).toContain("AND identified_user_id != ''");
      expect(sql).toContain("AND sessions >= {minSessions:UInt32}");
      expect(sql).toContain("AND effective_user_id NOT IN (");
    }
    expect(count).toContain("SELECT count() AS total_count");
  });

  it("limits and excludes ids at the event level in both queries", () => {
    for (const isCount of [false, true]) {
      expect(buildUsersQuery(base, 1, { matchingUserIds: ["u1"] }, isCount)).toContain(
        "AND events.identified_user_id IN ({matchingUserIds:Array(String)})"
      );
      expect(buildUsersQuery(base, 1, { excludedUserIds: ["u1"] }, isCount)).toContain(
        "AND events.identified_user_id NOT IN ({excludedUserIds:Array(String)})"
      );
    }
  });

  it("breaks sort ties on the user so pages do not overlap", () => {
    expect(buildUsersQuery({ ...base, sort_by: "sessions", sort_order: "asc" }, 1, null)).toContain(
      "ORDER BY sessions ASC, effective_user_id ASC"
    );
    expect(buildUsersQuery({ ...base, sort_by: "sessions; DROP TABLE events" }, 1, null)).toContain(
      "ORDER BY last_seen DESC, effective_user_id ASC"
    );
  });
});

describe("cohort and summary queries", () => {
  const filters = JSON.stringify([{ parameter: "country", type: "equals", value: ["DE"] }]);

  it("scope the cohort to the period, the filters and the narrowing, under a limit", () => {
    const query = { ...base, filters, min_sessions: "2" };
    const sql = buildCohortQuery(query, 1, buildUserNarrowing(query));

    expect(sql).toContain("FilteredSessions AS");
    expect(sql).toContain("INNER JOIN FilteredSessions USING (session_id)");
    expect(sql).toContain("toDateTime('2026-09-01', 'Europe/Berlin')");
    expect(sql).toContain("AND sessions >= {minSessions:UInt32}");
    expect(sql).toContain("ORDER BY identified_user_id = '' DESC");
    expect(sql).toContain("LIMIT {cohortLimit:Int32}");
  });

  it("builds the summary over the same sessions, with a bounded lookback", () => {
    const sql = buildUsersSummaryQuery({ ...base, filters }, 1);

    expect(sql).toContain("INNER JOIN FilteredSessions USING (session_id)");
    expect(sql).toContain("effective_user_id NOT IN (");
    expect(sql).toContain("toDateTime('2026-06-03', 'Europe/Berlin')");
    expect(sql).toContain("GROUP BY sessions, identified, is_new");
    expect(sql).toMatch(/LIMIT \d+/);
  });

  it("skips the lookback for all time", () => {
    expect(buildUsersSummaryQuery(allTime, 1)).not.toContain("NOT IN");
  });
});

describe("summarizeUsers", () => {
  const rows = [
    { sessions: 1, identified: 0, is_new: 1, users: 90 },
    { sessions: 1, identified: 0, is_new: 0, users: 4 },
    { sessions: 3, identified: 1, is_new: 0, users: 4 },
    { sessions: 10, identified: 1, is_new: 1, users: 2 },
  ];

  it("sums the histogram into the stat band's figures", () => {
    expect(summarizeUsers(rows, true)).toEqual({
      users: 100,
      identified_users: 6,
      sessions: 126,
      identified_sessions: 32,
      new_users: 92,
      returning_users: 8,
      lookback_days: 90,
      power_users: 6,
      power_min_sessions: 3,
    });
  });

  it("reports no new or returning split without a lookback", () => {
    expect(summarizeUsers(rows, false)).toMatchObject({ new_users: null, returning_users: null, users: 100 });
  });

  it("is all zeros for an empty period", () => {
    expect(summarizeUsers([], true)).toMatchObject({ users: 0, sessions: 0, new_users: 0, power_users: 0 });
  });

  it("never calls a single session a power user", () => {
    expect(powerUserThreshold([{ sessions: 1, identified: 0, is_new: 1, users: 1000 }])).toBe(2);
    expect(powerUserThreshold([])).toBe(2);
  });
});

describe("groupByTraitValue", () => {
  const row = (identified_user_id: string, sessions: number, users = 1): CohortRow => ({
    identified_user_id,
    users,
    sessions,
    pageviews: sessions * 2,
    events: sessions,
  });
  const rows = [row("", 50, 40), row("ann", 9), row("bob", 3), row("cy", 2), row("dee", 1), row("eve", 4)];
  const values = new Map([
    ["ann", "Pro"],
    ["bob", "Pro"],
    ["cy", "Free"],
    ["dee", ""],
  ]);

  it("puts every user in exactly one group, largest first", () => {
    const breakdown = groupByTraitValue("plan", rows, values);

    expect(breakdown.groups).toEqual([
      { value: "Pro", users: 2, sessions: 12, pageviews: 24, events: 12 },
      { value: "", users: 1, sessions: 1, pageviews: 2, events: 1 },
      { value: "Free", users: 1, sessions: 2, pageviews: 4, events: 2 },
    ]);
    // Anonymous users and the identified user without the trait.
    expect(breakdown.none).toEqual({ users: 41, sessions: 54, pageviews: 108, events: 54 });
    expect(breakdown.other).toBeNull();
    expect(breakdown.totals).toEqual({ users: 45, identified: 5, sessions: 69, pageviews: 138, events: 69 });

    const parts = [...breakdown.groups, breakdown.none!];
    expect(parts.reduce((sum, part) => sum + part.users, 0)).toBe(breakdown.totals!.users);
    expect(parts.reduce((sum, part) => sum + part.sessions, 0)).toBe(breakdown.totals!.sessions);
  });

  it("folds values past the limit into one row", () => {
    const breakdown = groupByTraitValue("plan", rows, values, 1);

    expect(breakdown.groups.map(group => group.value)).toEqual(["Pro"]);
    expect(breakdown.other).toEqual({ values: 2, users: 2, sessions: 3, pageviews: 6, events: 3 });
  });
});
