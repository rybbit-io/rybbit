import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  goals: [] as Record<string, unknown>[],
  rows: [] as Record<string, unknown>[],
  queries: [] as { query: string; params: Record<string, unknown> }[],
}));

vi.mock("../../../db/postgres/postgres.js", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: async () => state.goals,
          }),
        }),
      }),
    }),
  },
}));

vi.mock("../../../db/postgres/schema.js", () => ({
  goals: { siteId: "site_id", goalId: "goal_id" },
}));

vi.mock("drizzle-orm", () => ({
  asc: (column: unknown) => column,
  eq: (_column: unknown, value: unknown) => value,
}));

vi.mock("../utils/analyticsQuery.js", async () => {
  const actual = await vi.importActual<typeof import("../utils/analyticsQuery.js")>("../utils/analyticsQuery.js");
  return {
    ...actual,
    runAnalyticsQuery: vi.fn(async (spec: { query: string; params: Record<string, unknown> }) => {
      state.queries.push(spec);
      return state.rows;
    }),
  };
});

vi.mock("../../../db/clickhouse/clickhouse.js", () => ({ clickhouse: { query: vi.fn() } }));

import { getUserGoals, getUserSessionGoals } from "./getUserGoals.js";

const pricing = { goalId: 3, name: "Viewed pricing", goalType: "path", config: { pathPattern: "/pricing" } };
const signup = { goalId: 7, name: "Signup", goalType: "event", config: { eventName: "signup" } };
const unusable = { goalId: 9, name: null, goalType: "event", config: {} };

const call = async (
  handler: typeof getUserGoals | typeof getUserSessionGoals,
  query: Record<string, unknown> = {},
  extra = {}
) => {
  const reply = {
    statusCode: 200,
    payload: undefined as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    send(payload: unknown) {
      this.payload = payload;
      return this;
    },
  };
  const request = {
    params: { siteId: "1", userId: "alice" },
    query: { start_date: "2026-09-01", end_date: "2026-09-30", time_zone: "UTC", ...query },
    log: { error: vi.fn(), debug: vi.fn() },
    ...extra,
  };
  await handler(request as never, reply as never);
  return reply;
};

describe("getUserGoals", () => {
  beforeEach(() => {
    state.goals = [pricing, signup, unusable];
    state.rows = [];
    state.queries = [];
  });

  it("returns every site goal, with this user's sessions and latest completion in the window", async () => {
    state.rows = [
      {
        goal_3_sessions: 4,
        goal_3_last: "2026-09-28 10:02:11",
        goal_7_sessions: 0,
        // maxIf over no rows is the epoch.
        goal_7_last: "1970-01-01 00:00:00",
      },
    ];

    const reply = await call(getUserGoals);

    expect(reply.payload.data).toEqual([
      { goalId: 3, name: "Viewed pricing", goalType: "path", sessions: 4, last_completed: "2026-09-28 10:02:11" },
      { goalId: 7, name: "Signup", goalType: "event", sessions: 0, last_completed: null },
      { goalId: 9, name: null, goalType: "event", sessions: 0, last_completed: null },
    ]);
    expect(state.queries[0].params).toEqual({ userId: "alice", site: 1 });
  });

  it("answers without querying when the site has no goals", async () => {
    state.goals = [];

    const reply = await call(getUserGoals);

    expect(reply.payload.data).toEqual([]);
    expect(state.queries).toHaveLength(0);
  });

  it("refuses a bearer credential that cannot read goals", async () => {
    const reply = await call(getUserGoals, {}, { bearerAuth: true, bearerStatements: { users: ["read"] } });

    expect(reply.statusCode).toBe(403);
    expect(state.queries).toHaveLength(0);
  });
});

describe("getUserSessionGoals", () => {
  beforeEach(() => {
    state.goals = [pricing, signup];
    state.rows = [];
    state.queries = [];
  });

  it("maps each listed session to the goals it completed and leaves out the ones that completed none", async () => {
    state.rows = [
      { session_id: "s1", goal_3: 2, goal_7: 1 },
      { session_id: "s2", goal_3: 0, goal_7: 0 },
      { session_id: "s3", goal_3: 0, goal_7: 1 },
    ];

    const reply = await call(getUserSessionGoals, { session_ids: JSON.stringify(["s1", "s2", "s3"]) });

    expect(reply.payload.data).toEqual([
      { session_id: "s1", goal_ids: [3, 7] },
      { session_id: "s3", goal_ids: [7] },
    ]);
    expect(state.queries[0].params).toEqual({ userId: "alice", site: 1, sessionIds: ["s1", "s2", "s3"] });
  });

  it("rejects a missing or malformed session list", async () => {
    expect((await call(getUserSessionGoals)).statusCode).toBe(400);
    expect((await call(getUserSessionGoals, { session_ids: "s1" })).statusCode).toBe(400);
    expect(state.queries).toHaveLength(0);
  });

  it("refuses a bearer credential that cannot read goals", async () => {
    const reply = await call(
      getUserSessionGoals,
      { session_ids: JSON.stringify(["s1"]) },
      { bearerAuth: true, bearerStatements: { users: ["read"] } }
    );

    expect(reply.statusCode).toBe(403);
  });
});
