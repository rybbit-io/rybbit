import { FastifyRequest } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ goals: [] as Record<string, unknown>[], reads: 0 }));

vi.mock("../../../db/postgres/postgres.js", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: async () => {
              state.reads += 1;
              return state.goals;
            },
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

import { getSessionGoalMatcher } from "./sessionGoals.js";

const signup = { goalId: 7, name: "Signup", goalType: "event", config: { eventName: "signup" } };
const request = (extra: Record<string, unknown> = {}) => extra as unknown as FastifyRequest;

describe("getSessionGoalMatcher", () => {
  beforeEach(() => {
    state.goals = [signup];
    state.reads = 0;
  });

  it("matches the site's goals for a dashboard session", async () => {
    const matcher = await getSessionGoalMatcher(1, request());

    expect(matcher.goals).toEqual([{ id: 7, name: "Signup" }]);
  });

  it("matches the site's goals for a credential that may read goals", async () => {
    const matcher = await getSessionGoalMatcher(
      1,
      request({ bearerAuth: true, bearerStatements: { sessions: ["read"], goals: ["read"] } })
    );

    expect(matcher.goals).toHaveLength(1);
  });

  it("gives a credential without goals:read no goals, and does not read them", async () => {
    const matcher = await getSessionGoalMatcher(
      1,
      request({ bearerAuth: true, bearerStatements: { sessions: ["read"] } })
    );

    expect(matcher.goals).toEqual([]);
    expect(matcher.expression).toBe("emptyArrayUInt32()");
    expect(state.reads).toBe(0);
  });
});
