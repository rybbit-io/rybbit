import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  actor: { userId: null as string | null, hasSiteAccess: false, canManage: false, canManageSite: false },
  organizationId: "org_1" as string | null,
  segments: [] as Record<string, unknown>[],
  counts: {} as Record<string, number>,
  queries: [] as { query: string; params: Record<string, unknown> }[],
}));

vi.mock("../segments/segmentAccess.js", async () => {
  const actual = await vi.importActual<typeof import("../segments/segmentAccess.js")>("../segments/segmentAccess.js");
  return {
    ...actual,
    getSiteOrganizationId: async () => state.organizationId,
    resolveSegmentActor: async () => state.actor,
  };
});

vi.mock("../../../db/postgres/postgres.js", () => ({
  db: { query: { segments: { findMany: async () => state.segments } } },
}));
vi.mock("../../../lib/auth.js", () => ({ auth: { api: {} } }));

vi.mock("../utils/analyticsQuery.js", async () => {
  const actual = await vi.importActual<typeof import("../utils/analyticsQuery.js")>("../utils/analyticsQuery.js");
  return {
    ...actual,
    runAnalyticsQuery: vi.fn(async (spec: { query: string; params: Record<string, unknown> }) => {
      state.queries.push(spec);
      return [state.counts];
    }),
  };
});

import { getUserSegments, MAX_USER_SEGMENTS } from "./getUserSegments.js";

const country = (code: string) => ({ parameter: "country", type: "equals", value: [code] });

const segment = (segmentId: number, name: string, isPublic: boolean, filters: unknown[] = [country("SE")]) => ({
  segmentId,
  name,
  isPublic,
  filters,
  siteId: 1,
  organizationId: "org_1",
  userId: "owner",
});

const call = async (extra: Record<string, unknown> = {}) => {
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
    query: { start_date: "2026-09-01", end_date: "2026-09-30", time_zone: "UTC" },
    log: { error: vi.fn(), debug: vi.fn() },
    ...extra,
  };
  await getUserSegments(request as never, reply as never);
  return reply;
};

describe("getUserSegments", () => {
  beforeEach(() => {
    state.actor = { userId: "u1", hasSiteAccess: true, canManage: false, canManageSite: false };
    state.organizationId = "org_1";
    state.segments = [];
    state.counts = {};
    state.queries = [];
  });

  it("lists the segments this user's sessions match, largest first, out of the user's total", async () => {
    state.segments = [segment(1, "Docs readers", false), segment(2, "Organic", true), segment(3, "Unmatched", false)];
    state.counts = { segment_1: 3, segment_2: 34, segment_3: 0, total_sessions: 42 };

    const reply = await call();

    expect(reply.payload.data).toEqual({
      segments: [
        { segmentId: 2, name: "Organic", filters: [country("SE")], sessions: 34 },
        { segmentId: 1, name: "Docs readers", filters: [country("SE")], sessions: 3 },
      ],
      total_sessions: 42,
      truncated: false,
    });
    expect(state.queries).toHaveLength(1);
    expect(state.queries[0].params).toEqual({ userId: "alice", site: 1 });
  });

  it("evaluates only public segments for a public or private-link viewer", async () => {
    state.actor = { userId: null, hasSiteAccess: false, canManage: false, canManageSite: false };
    state.segments = [segment(1, "Private", false), segment(2, "Public", true)];
    state.counts = { segment_1: 9, segment_2: 4, total_sessions: 10 };

    const reply = await call();

    expect(state.queries[0].query).toContain("Segment_2 AS (");
    expect(state.queries[0].query).not.toContain("Segment_1");
    expect(reply.payload.data.segments).toEqual([
      { segmentId: 2, name: "Public", filters: [country("SE")], sessions: 4 },
    ]);
  });

  it("refuses a bearer credential that cannot read segments", async () => {
    state.segments = [segment(1, "Docs readers", false)];

    const reply = await call({ bearerAuth: true, bearerStatements: { users: ["read"] } });

    expect(reply.statusCode).toBe(403);
    expect(state.queries).toHaveLength(0);
  });

  it("runs nothing when the site has no segments with filters", async () => {
    state.segments = [segment(1, "Empty", false, [])];

    const reply = await call();

    expect(reply.payload.data).toEqual({ segments: [], total_sessions: 0, truncated: false });
    expect(state.queries).toHaveLength(0);
  });

  it("caps how many segments one request evaluates and says so", async () => {
    state.segments = Array.from({ length: MAX_USER_SEGMENTS + 3 }, (_, i) => segment(i + 1, `Segment ${i + 1}`, false));

    const reply = await call();

    expect(state.queries[0].query.match(/Segment_\d+ AS \(/g)).toHaveLength(MAX_USER_SEGMENTS);
    expect(reply.payload.data.truncated).toBe(true);
  });

  it("404s an unknown site", async () => {
    state.organizationId = null;

    const reply = await call();

    expect(reply.statusCode).toBe(404);
  });
});
