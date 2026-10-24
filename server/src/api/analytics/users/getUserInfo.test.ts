import { beforeEach, describe, expect, it, vi } from "vitest";

// Per-test state driving the mocked ClickHouse and Postgres reads.
const state = {
  // Rows keyed by the user id the query was run with.
  rowsByUserId: {} as Record<string, Record<string, unknown>[]>,
  // anonymousId -> identified user id, i.e. the userAliases table.
  aliases: {} as Record<string, string>,
  queriedUserIds: [] as string[],
};

// ClickHouse answers an aggregate without GROUP BY over no rows with one
// all-default row, not an empty result. The profile query only comes back empty
// for an unknown user because it filters that row out, so the stub returns the
// default row unless the query does.
const emptyProfileResult = (query: string) =>
  /HAVING count\(\) > 0/.test(query) ? [] : [{ sessions: 0, user_id: "", identified_user_id: "", pageviews: 0 }];

vi.mock("../utils/analyticsQuery.js", () => ({
  runAnalyticsQuery: vi.fn(async ({ query, params }: { query: string; params: { userId: string } }) => {
    state.queriedUserIds.push(params.userId);
    // Only the profile query is keyed to user rows here; the vitals, location
    // and device breakdowns come back empty.
    if (!query.includes("COUNT(DISTINCT session_id) AS sessions")) return [];
    return state.rowsByUserId[params.userId] ?? emptyProfileResult(query);
  }),
}));

vi.mock("../../../db/postgres/postgres.js", () => ({
  db: {
    select: vi.fn((columns?: Record<string, unknown>) => ({
      from: () => ({
        // Linked-device lookups await where() directly; profile and alias lookups
        // chain .limit(1) first. Support both by returning a thenable with .limit.
        where: () => ({
          limit: async () => resolveAliasRows(columns),
          then: (resolve: (rows: unknown[]) => void) => resolve([]),
        }),
      }),
    })),
  },
}));

// The alias lookup is the only select that projects just { userId }; the traits
// select projects the whole row. Distinguishing them keeps the stub honest.
function resolveAliasRows(columns?: Record<string, unknown>) {
  const isAliasLookup = !!columns && Object.keys(columns).length === 1 && "userId" in columns;
  if (!isAliasLookup) return [];
  const identified = state.aliases[currentAnonymousId];
  return identified ? [{ userId: identified }] : [];
}

let currentAnonymousId = "";

vi.mock("../../../db/postgres/schema.js", () => ({
  userProfiles: { siteId: "site_id", userId: "user_id", traits: "traits" },
  userAliases: { siteId: "site_id", anonymousId: "anonymous_id", userId: "user_id", createdAt: "created_at" },
}));

vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => args,
  eq: (_col: unknown, value: unknown) => value,
}));

import { getUserInfo } from "./getUserInfo.js";

const makeReply = () => {
  const reply = {
    statusCode: 200,
    payload: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    send(payload: unknown) {
      this.payload = payload;
      return this;
    },
  };
  return reply;
};

const makeRequest = (userId: string) =>
  ({
    params: { siteId: "1", userId },
    query: {},
    log: { error: vi.fn() },
  }) as never;

const userRow = (identifiedUserId: string) => ({
  user_id: "fp1",
  identified_user_id: identifiedUserId,
  sessions: 3,
  pageviews: 12,
});

describe("getUserInfo alias fallback", () => {
  beforeEach(() => {
    state.rowsByUserId = {};
    state.aliases = {};
    state.queriedUserIds = [];
    currentAnonymousId = "";
  });

  it("serves the identity when the device's rows have all been backfilled to it", async () => {
    // The dashboard's Identify User action rewrites the device's whole history, so
    // the anonymous route id matches nothing afterwards.
    currentAnonymousId = "fp1";
    state.aliases = { fp1: "alice" };
    state.rowsByUserId = { alice: [userRow("alice")] };

    const reply = makeReply();
    await getUserInfo(makeRequest("fp1"), reply as never);

    expect(reply.statusCode).toBe(200);
    expect((reply.payload as { data: { identified_user_id: string } }).data.identified_user_id).toBe("alice");
    expect(state.queriedUserIds).toContain("fp1");
    expect(state.queriedUserIds).toContain("alice");
  });

  it("keeps serving a device's own anonymous activity instead of resolving early", async () => {
    // A shared fingerprint still has anonymous rows of its own even after one person
    // behind it is identified. That activity is what this route is about.
    currentAnonymousId = "fp1";
    state.aliases = { fp1: "alice" };
    state.rowsByUserId = { fp1: [userRow("")] };

    const reply = makeReply();
    await getUserInfo(makeRequest("fp1"), reply as never);

    expect(reply.statusCode).toBe(200);
    expect(state.queriedUserIds).not.toContain("alice");
  });

  it("still 404s a device that was never seen and has no alias", async () => {
    currentAnonymousId = "unknown";

    const reply = makeReply();
    await getUserInfo(makeRequest("unknown"), reply as never);

    expect(reply.statusCode).toBe(404);
  });
});
