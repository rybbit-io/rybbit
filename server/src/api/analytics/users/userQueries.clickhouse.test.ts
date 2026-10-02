import { createClient } from "@clickhouse/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Run against any ClickHouse using CLICKHOUSE_TEST_URL and optional
// CLICKHOUSE_TEST_USER / CLICKHOUSE_TEST_PASSWORD. Every query supplies its own
// events CTE: no tables, migrations or production data are needed.
vi.mock("../../../db/clickhouse/clickhouse.js", () => ({ clickhouse: {} }));
vi.mock("../../../db/postgres/postgres.js", () => ({ db: {} }));

import { buildUsersQuery, GetUsersRequest } from "./getUsers.js";
import { buildUsersSummaryQuery, SessionHistogramRow, summarizeUsers } from "./getUsersSummary.js";
import { buildCohortQuery, buildUserNarrowing, CohortRow, UserScope } from "./userScope.js";

// site, time, session, device id, identified user, event type, country
const events: [number, string, string, string, string, string, string][] = [
  // An anonymous visitor who was also here inside the lookback: returning.
  [1, "2026-08-01 10:00:00", "a-old", "dev-a", "", "pageview", "US"],
  [1, "2026-09-10 10:00:00", "a-1", "dev-a", "", "pageview", "US"],
  [1, "2026-09-10 10:01:00", "a-1", "dev-a", "", "pageview", "US"],
  // An anonymous visitor seen for the first time.
  [1, "2026-09-10 11:00:00", "b-1", "dev-b", "", "pageview", "DE"],
  // Identified, three sessions, seen inside the lookback: returning.
  [1, "2026-07-15 09:00:00", "ann-old", "dev-c", "ann", "pageview", "US"],
  [1, "2026-09-10 09:00:00", "ann-1", "dev-c", "ann", "pageview", "US"],
  [1, "2026-09-11 09:00:00", "ann-2", "dev-c", "ann", "pageview", "US"],
  [1, "2026-09-12 09:00:00", "ann-3", "dev-c", "ann", "custom_event", "US"],
  // Identified, one session.
  [1, "2026-09-11 12:00:00", "bob-1", "dev-d", "bob", "pageview", "US"],
  [1, "2026-09-11 12:01:00", "bob-1", "dev-d", "bob", "custom_event", "US"],
  // Identified, two sessions.
  [1, "2026-09-10 15:00:00", "cy-1", "dev-e", "cy", "pageview", "DE"],
  [1, "2026-09-12 15:00:00", "cy-2", "dev-e", "cy", "pageview", "DE"],
  // Last seen before the lookback begins: new again, by the bounded definition.
  [1, "2026-01-01 08:00:00", "dee-old", "dev-f", "dee", "pageview", "US"],
  [1, "2026-09-12 08:00:00", "dee-1", "dev-f", "dee", "pageview", "US"],
  // Outside the period, and another site reusing the same ids.
  [1, "2026-08-20 08:00:00", "z-1", "dev-z", "", "pageview", "US"],
  [2, "2026-09-11 08:00:00", "a-1", "dev-a", "ann", "pageview", "US"],
];

const fixture = `WITH events AS (
  SELECT *, '' AS region, '' AS city, 'en' AS language, 'Chrome' AS browser, '120' AS browser_version,
    'macOS' AS operating_system, '14' AS operating_system_version, 'Desktop' AS device_type,
    toUInt16(1440) AS screen_width, toUInt16(900) AS screen_height, '' AS referrer, 'Direct' AS channel,
    'example.com' AS hostname, '' AS tag
  FROM values(
    'site_id Int32, timestamp DateTime, session_id String, user_id String, identified_user_id String, type String, country String',
    ${events.map(row => `(${row.map(value => (typeof value === "number" ? value : `'${value}'`)).join(",")})`).join(",")}
  )
)`;

type Query = GetUsersRequest["Querystring"];
const period: Query = { filters: "", start_date: "2026-09-10", end_date: "2026-09-12", time_zone: "UTC" };
const germany = JSON.stringify([{ parameter: "country", type: "equals", value: ["DE"] }]);

describe.skipIf(!process.env.CLICKHOUSE_TEST_URL)("Users page queries against ClickHouse", () => {
  let client: ReturnType<typeof createClient>;

  beforeAll(() => {
    client = createClient({
      url: process.env.CLICKHOUSE_TEST_URL,
      username: process.env.CLICKHOUSE_TEST_USER || "default",
      password: process.env.CLICKHOUSE_TEST_PASSWORD || "",
      compression: { request: false, response: false },
      clickhouse_settings: { readonly: "2", max_threads: 2, max_execution_time: 10 },
    });
  });
  afterAll(async () => {
    await client.close();
  });

  async function run<T>(query: string, params: Record<string, unknown>) {
    const sql = /^\s*WITH\s*\S/.test(query) ? query.replace(/^\s*WITH\b/, `${fixture},`) : `${fixture} ${query}`;
    const result = await client.query({ query: sql, query_params: params, format: "JSONEachRow" });
    return result.json<T>();
  }

  /** The listed users, in order, and what the count query says. */
  async function list(query: Query, scope: UserScope | null = null) {
    const { params } = buildUserNarrowing(query, scope ?? {});
    const rows = await run<{ effective_user_id: string; sessions: string }>(buildUsersQuery(query, 1, scope, false), {
      siteId: 1,
      limit: 100,
      offset: 0,
      ...params,
    });
    const count = await run<{ total_count: string }>(buildUsersQuery(query, 1, scope, true), { siteId: 1, ...params });
    return { ids: rows.map(row => row.effective_user_id), total: Number(count[0]?.total_count ?? 0) };
  }

  it("lists everyone in the period, newest first, and counts the same people", async () => {
    expect(await list(period)).toEqual({ ids: ["cy", "ann", "dee", "bob", "dev-b", "dev-a"], total: 6 });
  });

  it.each<[string, Partial<Query>, UserScope | null, string[]]>([
    ["identified only", { identified_only: "true" }, null, ["cy", "ann", "dee", "bob"]],
    ["a minimum session count", { min_sessions: "2" }, null, ["cy", "ann"]],
    ["new in the period", { new_only: "true" }, null, ["cy", "dee", "bob", "dev-b"]],
    ["new and identified", { new_only: "true", identified_only: "true" }, null, ["cy", "dee", "bob"]],
    ["a user-id search, any case", { search: "DEV-", search_field: "user_id" }, null, ["dev-b", "dev-a"]],
    ["a user-id search on a custom id", { search: "an", search_field: "user_id" }, null, ["ann"]],
    ["ids resolved in Postgres", {}, { matchingUserIds: ["ann", "bob", "nobody"] }, ["ann", "bob"]],
    ["ids left out", {}, { excludedUserIds: ["ann", "bob"] }, ["cy", "dee", "dev-b", "dev-a"]],
    ["a session filter", { filters: germany }, null, ["cy", "dev-b"]],
    ["a session filter and a quick filter", { filters: germany, min_sessions: "2" }, null, ["cy"]],
    ["nobody", { min_sessions: "50" }, null, []],
  ])("narrows the list and its count by %s", async (_name, extra, scope, expected) => {
    expect(await list({ ...period, ...extra }, scope)).toEqual({ ids: expected, total: expected.length });
  });

  it("treats everyone as new over all time", async () => {
    const allTime: Query = { filters: "", start_date: "", end_date: "", time_zone: "UTC", new_only: "true" };
    expect((await list(allTime)).total).toBe(7);
  });

  it("summarises the same period for the stat band", async () => {
    const rows = await run<Record<keyof SessionHistogramRow, string>>(buildUsersSummaryQuery(period, 1), { siteId: 1 });
    const histogram = rows.map(row => ({
      sessions: Number(row.sessions),
      identified: Number(row.identified),
      is_new: Number(row.is_new),
      users: Number(row.users),
    }));

    expect(summarizeUsers(histogram, true)).toEqual({
      users: 6,
      identified_users: 4,
      sessions: 9,
      identified_sessions: 7,
      // dev-a and ann were seen in the 90 days before; dee's last visit is older than that.
      new_users: 4,
      returning_users: 2,
      lookback_days: 90,
      power_users: 1,
      power_min_sessions: 3,
    });
  });

  it("applies filters to the summary but not to what counts as seen before", async () => {
    const rows = await run<Record<keyof SessionHistogramRow, string>>(
      buildUsersSummaryQuery({ ...period, filters: germany }, 1),
      { siteId: 1 }
    );
    expect(rows.reduce((sum, row) => sum + Number(row.users), 0)).toBe(2);
    expect(rows.every(row => Number(row.is_new) === 1)).toBe(true);
  });

  it("returns one cohort row per identified user and one for all anonymous users", async () => {
    const narrowing = buildUserNarrowing(period);
    const rows = await run<Record<keyof CohortRow, string>>(buildCohortQuery(period, 1, narrowing), {
      siteId: 1,
      cohortLimit: 100,
    });

    expect(rows.map(row => [row.identified_user_id, Number(row.users), Number(row.sessions)])).toEqual([
      ["", 2, 2],
      ["ann", 1, 3],
      ["bob", 1, 1],
      ["cy", 1, 2],
      ["dee", 1, 1],
    ]);
    expect(rows.map(row => [Number(row.pageviews), Number(row.events)])).toEqual([
      [3, 0],
      [2, 1],
      [1, 1],
      [2, 0],
      [1, 0],
    ]);
  });

  it("keeps the anonymous row when the cohort limit cuts identified users", async () => {
    const rows = await run<Record<keyof CohortRow, string>>(buildCohortQuery(period, 1, buildUserNarrowing(period)), {
      siteId: 1,
      cohortLimit: 3,
    });
    expect(rows.map(row => row.identified_user_id)).toEqual(["", "ann", "bob"]);
  });

  it("applies the quick filters to the cohort, so a group matches its rows", async () => {
    const query = { ...period, min_sessions: "2" };
    const narrowing = buildUserNarrowing(query);
    const rows = await run<Record<keyof CohortRow, string>>(buildCohortQuery(query, 1, narrowing), {
      siteId: 1,
      cohortLimit: 100,
      ...narrowing.params,
    });
    expect(rows.map(row => row.identified_user_id)).toEqual(["ann", "cy"]);
  });
});
