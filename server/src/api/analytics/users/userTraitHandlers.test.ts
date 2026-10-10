import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clickhouseQuery: vi.fn(),
}));

vi.mock("../../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: mocks.clickhouseQuery },
}));

vi.mock("../../../db/postgres/postgres.js", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("../../../db/postgres/schema.js");
  const client = new PGlite();
  const real = drizzle(client, { schema });
  // postgres-js hands back the rows themselves from execute(); PGlite wraps them.
  const db = new Proxy(real, {
    get(target, prop) {
      if (prop === "execute") return async (query: any) => (await target.execute(query)).rows;
      const value = (target as any)[prop];
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  return { db, sql: client };
});

import { sql as pgClient } from "../../../db/postgres/postgres.js";
import { getUserTraitBreakdown } from "./getUserTraitBreakdown.js";
import { getUsers } from "./getUsers.js";
import { MAX_SCOPED_USER_IDS } from "./userScope.js";

const pg = pgClient as unknown as { exec: (query: string) => Promise<unknown>; close: () => Promise<void> };

const SITE = 1;
const BULK_SITE = 2;
const period = { filters: "", start_date: "2026-09-01", end_date: "2026-09-30", time_zone: "UTC" };

const profile = (id: string, traits: Record<string, unknown>) =>
  `(${SITE}, '${id}', '${JSON.stringify(traits)}'::jsonb)`;

function replyStub() {
  const reply: any = { statusCode: 200 };
  reply.status = (code: number) => {
    reply.statusCode = code;
    return reply;
  };
  reply.send = (body: unknown) => {
    reply.body = body;
    return reply;
  };
  return reply;
}

const request = (siteId: number, query: Record<string, unknown>) =>
  ({ params: { siteId: String(siteId) }, query, log: { error: vi.fn(), debug: vi.fn() } }) as any;

type Call = { query: string; query_params: Record<string, any> };
const calls = (): Call[] => mocks.clickhouseQuery.mock.calls.map(([call]) => call);
const isCohort = (call: Call) => call.query.includes("UserStats AS");
const isList = (call: Call) => call.query.includes("AggregatedUsers AS");

const cohortRow = (identified_user_id: string, users: number, sessions: number) => ({
  identified_user_id,
  users,
  sessions,
  pageviews: sessions * 3,
  events: sessions,
});

// Who ClickHouse says was active in the period. "dormant" has a profile but is not among them.
const activeCohort = [
  cohortRow("", 40, 44),
  cohortRow("ann", 1, 9),
  cohortRow("bob", 1, 3),
  cohortRow("cy", 1, 2),
  cohortRow("dee", 1, 1),
  cohortRow("eve", 1, 4),
];

/** Answers ClickHouse: the cohort for a cohort query, one list row per requested id, and a count. */
function answerWith(cohort: unknown[]) {
  mocks.clickhouseQuery.mockImplementation(async (call: Call) => {
    let rows: unknown[] = [{ total_count: 99 }];
    if (isCohort(call)) rows = cohort;
    else if (isList(call)) {
      rows = (call.query_params.matchingUserIds ?? ["anon-device"]).map((id: string) => ({
        user_id: `device-${id}`,
        identified_user_id: call.query_params.matchingUserIds ? id : "",
        sessions: 1,
      }));
    }
    return { json: async () => rows };
  });
}

beforeAll(async () => {
  await pg.exec(`
    CREATE TABLE user_profiles (
      site_id integer NOT NULL,
      user_id text NOT NULL,
      traits jsonb DEFAULT '{}'::jsonb,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL,
      PRIMARY KEY (site_id, user_id)
    );
    INSERT INTO user_profiles (site_id, user_id, traits) VALUES
      ${profile("ann", { name: "Ann Lee", plan: "Pro" })},
      ${profile("bob", { name: "Bob Marsh", plan: "Pro" })},
      ${profile("cy", { name: "Cy Annan", plan: "Free" })},
      ${profile("dee", { name: "Dee Ruiz", plan: null })},
      ${profile("eve", { name: "Eve Stone" })},
      ${profile("dormant", { name: "Dormant Dora", plan: "Pro" })};
    INSERT INTO user_profiles (site_id, user_id, traits)
      SELECT ${BULK_SITE}, 'bulk-' || n, '{"name": "Bulk Person"}'::jsonb
      FROM generate_series(1, ${MAX_SCOPED_USER_IDS + 1}) AS n;
  `);
});

afterAll(async () => {
  await pg.close();
});

beforeEach(() => {
  mocks.clickhouseQuery.mockReset();
  answerWith(activeCohort);
});

describe("getUserTraitBreakdown", () => {
  it("groups the people active in the period by the trait stored in Postgres", async () => {
    const reply = replyStub();
    await getUserTraitBreakdown(request(SITE, { ...period, key: "plan" }), reply);

    expect(reply.body.data).toEqual({
      key: "plan",
      limited: false,
      limit: MAX_SCOPED_USER_IDS,
      totals: { users: 45, identified: 5, sessions: 63, pageviews: 189, events: 63 },
      groups: [
        // Dormant Dora is Pro too, but was not here in the period.
        { value: "Pro", users: 2, sessions: 12, pageviews: 36, events: 12 },
        { value: "Free", users: 1, sessions: 2, pageviews: 6, events: 2 },
      ],
      other: null,
      // Anonymous users, the user whose plan is null and the user without the key.
      none: { users: 42, sessions: 49, pageviews: 147, events: 49 },
      searchLimited: false,
    });
  });

  it("asks ClickHouse for one identified user past the ceiling, and passes the quick filters on", async () => {
    await getUserTraitBreakdown(request(SITE, { ...period, key: "plan", min_sessions: "3" }), replyStub());

    expect(calls()).toHaveLength(1);
    expect(calls()[0].query_params).toEqual({ siteId: SITE, cohortLimit: MAX_SCOPED_USER_IDS + 2, minSessions: 3 });
    expect(calls()[0].query).toContain("AND sessions >= {minSessions:UInt32}");
  });

  it("refuses to group a sample when too many identified users were active", async () => {
    answerWith([
      cohortRow("", 5, 5),
      ...Array.from({ length: MAX_SCOPED_USER_IDS + 1 }, (_, index) => cohortRow(`u${index}`, 1, 1)),
    ]);
    const reply = replyStub();
    await getUserTraitBreakdown(request(SITE, { ...period, key: "plan" }), reply);

    expect(reply.body.data).toMatchObject({ limited: true, limit: MAX_SCOPED_USER_IDS, totals: null, groups: [] });
  });

  it("groups only the searched users", async () => {
    // The cohort ClickHouse returns once it is limited to the two profiles named Ann*/Annan.
    answerWith([cohortRow("ann", 1, 9), cohortRow("cy", 1, 2)]);
    const reply = replyStub();
    await getUserTraitBreakdown(request(SITE, { ...period, key: "plan", search: "ANN", search_field: "name" }), reply);

    expect(calls()[0].query_params.matchingUserIds.sort()).toEqual(["ann", "cy"]);
    expect(reply.body.data.groups.map((group: { value: string }) => group.value)).toEqual(["Free", "Pro"]);
    expect(reply.body.data.none).toEqual({ users: 0, sessions: 0, pageviews: 0, events: 0 });
  });

  it("needs a key", async () => {
    const reply = replyStub();
    await getUserTraitBreakdown(request(SITE, period), reply);

    expect(reply.statusCode).toBe(400);
    expect(mocks.clickhouseQuery).not.toHaveBeenCalled();
  });
});

describe("getUsers for a trait group", () => {
  it("lists the active users whose trait has the value, with their traits", async () => {
    const reply = replyStub();
    await getUsers(request(SITE, { ...period, trait_key: "plan", trait_value: "Pro" }), reply);

    const list = calls().find(isList)!;
    expect(list.query_params.matchingUserIds.sort()).toEqual(["ann", "bob"]);
    expect(list.query_params.excludedUserIds).toBeUndefined();
    expect(reply.body.data.map((row: any) => [row.identified_user_id, row.traits.name])).toEqual([
      ["ann", "Ann Lee"],
      ["bob", "Bob Marsh"],
    ]);
    expect(reply.body.totalCount).toBe(99);
  });

  it("lists everyone without a value by leaving out those who have one", async () => {
    await getUsers(request(SITE, { ...period, trait_key: "plan", trait_missing: "true" }), replyStub());

    const list = calls().find(isList)!;
    expect(list.query_params.excludedUserIds.sort()).toEqual(["ann", "bob", "cy"]);
    expect(list.query_params.matchingUserIds).toBeUndefined();
    // Not forced to identified: anonymous users have no plan either.
    expect(list.query).not.toContain("AND identified_user_id != ''");
  });

  it("narrows a search to the matches without a value, in one list", async () => {
    // Ann Lee, Dee Ruiz and Eve Stone have an "e" in their name and were all active.
    answerWith([cohortRow("ann", 1, 9), cohortRow("dee", 1, 1), cohortRow("eve", 1, 4)]);
    await getUsers(
      request(SITE, { ...period, trait_key: "plan", trait_missing: "true", search: "e", search_field: "name" }),
      replyStub()
    );

    expect(calls().find(isCohort)!.query_params.matchingUserIds.sort()).toEqual(["ann", "dee", "eve"]);
    const list = calls().find(isList)!;
    // Ann has a plan; Dee's is null and Eve has none.
    expect(list.query_params.matchingUserIds.sort()).toEqual(["dee", "eve"]);
    expect(list.query_params.excludedUserIds).toBeUndefined();
  });

  it("answers an empty group without asking ClickHouse for the list", async () => {
    const reply = replyStub();
    await getUsers(request(SITE, { ...period, trait_key: "plan", trait_value: "Enterprise" }), reply);

    expect(reply.body).toMatchObject({ data: [], totalCount: 0 });
    expect(calls().filter(isList)).toHaveLength(0);
  });

  it("says so instead of listing when the period has too many identified users", async () => {
    answerWith(Array.from({ length: MAX_SCOPED_USER_IDS + 1 }, (_, index) => cohortRow(`u${index}`, 1, 1)));
    const reply = replyStub();
    await getUsers(request(SITE, { ...period, trait_key: "plan", trait_value: "Pro" }), reply);

    expect(reply.body).toMatchObject({ data: [], totalCount: 0, breakdownLimited: true });
  });

  it.each([
    [{ trait_key: "plan" }, "trait_key needs trait_value or trait_missing=true"],
    [{ min_sessions: "0" }, expect.any(String)],
    [{ new_only: "1" }, expect.any(String)],
  ])("rejects %o", async (params, error) => {
    const reply = replyStub();
    await getUsers(request(SITE, { ...period, ...params }), reply);

    expect(reply.statusCode).toBe(400);
    expect(reply.body.error).toEqual(error);
    expect(mocks.clickhouseQuery).not.toHaveBeenCalled();
  });
});

describe("getUsers search", () => {
  it("resolves a name search to profile ids, ignoring case", async () => {
    const reply = replyStub();
    await getUsers(request(SITE, { ...period, search: "marsh", search_field: "name" }), reply);

    expect(calls().every(call => call.query_params.matchingUserIds?.join() === "bob")).toBe(true);
    expect(reply.body.searchLimited).toBe(false);
  });

  it("searches ids in ClickHouse, where anonymous users are, without touching profiles", async () => {
    await getUsers(request(SITE, { ...period, search: "a1d7", search_field: "user_id" }), replyStub());

    const list = calls().find(isList)!;
    expect(list.query_params.userIdSearch).toBe("a1d7");
    expect(list.query_params.matchingUserIds).toBeUndefined();
    expect(list.query).not.toContain("AND identified_user_id != ''");
  });

  it("answers a search nobody matches without asking ClickHouse", async () => {
    const reply = replyStub();
    await getUsers(request(SITE, { ...period, search: "zzz", search_field: "email" }), reply);

    expect(reply.body).toMatchObject({ data: [], totalCount: 0 });
    expect(mocks.clickhouseQuery).not.toHaveBeenCalled();
  });

  it("flags a search that matches more profiles than it can look up", async () => {
    const reply = replyStub();
    await getUsers(request(BULK_SITE, { ...period, search: "bulk", search_field: "name" }), reply);

    expect(calls().find(isList)!.query_params.matchingUserIds).toHaveLength(MAX_SCOPED_USER_IDS);
    expect(reply.body.searchLimited).toBe(true);
  });
});
