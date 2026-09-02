import type { Filter } from "@rybbit/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  loaded: null as null | { segment: any; organizationId: string },
  actor: { userId: null as string | null, hasSiteAccess: false, isAdmin: false },
}));

vi.mock("./segmentAccess.js", async () => {
  const actual = await vi.importActual<typeof import("./segmentAccess.js")>("./segmentAccess.js");
  return {
    ...actual,
    loadSegmentForSite: async () => state.loaded,
    resolveSegmentActor: async () => state.actor,
  };
});

vi.mock("../../../db/postgres/postgres.js", () => ({ db: {} }));

import { expandSegmentParam, mergeSegmentFilters } from "./expandSegmentParam.js";

const mobile: Filter = { parameter: "device_type", type: "equals", value: ["Mobile"] };
const germany: Filter = { parameter: "country", type: "equals", value: ["DE"] };
const chrome: Filter = { parameter: "browser", type: "equals", value: ["Chrome"] };

function run(
  query: Record<string, unknown>,
  params: Record<string, string> = { siteId: "1" },
  extra: Record<string, unknown> = {}
) {
  const request: any = { query, params, headers: {}, ...extra };
  const reply: any = { statusCode: 200 };
  reply.status = vi.fn((code: number) => {
    reply.statusCode = code;
    return reply;
  });
  reply.send = vi.fn((payload: unknown) => {
    reply.payload = payload;
    return reply;
  });
  return expandSegmentParam(request, reply).then(() => ({ request, reply }));
}

beforeEach(() => {
  state.loaded = {
    segment: { segmentId: 7, siteId: 1, organizationId: "org_1", userId: "u", isPublic: false, filters: [mobile, germany] },
    organizationId: "org_1",
  };
  state.actor = { userId: "u", hasSiteAccess: true, isAdmin: false };
});

describe("mergeSegmentFilters", () => {
  it("puts the segment first and drops ad-hoc duplicates", () => {
    expect(mergeSegmentFilters([mobile, germany], [chrome, { ...mobile }])).toEqual([mobile, germany, chrome]);
  });

  it("keeps a filter that differs only in value", () => {
    const mobileTablet = { ...mobile, value: ["Mobile", "Tablet"] };
    expect(mergeSegmentFilters([mobile], [mobileTablet])).toEqual([mobile, mobileTablet]);
  });
});

describe("expandSegmentParam", () => {
  it("does nothing when segment_id is absent", async () => {
    const { request, reply } = await run({ filters: JSON.stringify([chrome]) });
    expect(reply.status).not.toHaveBeenCalled();
    expect(request.query.filters).toBe(JSON.stringify([chrome]));
  });

  it("expands the segment into filters, ANDed with the caller's own", async () => {
    const { request, reply } = await run({ segment_id: "7", filters: JSON.stringify([chrome]) });
    expect(reply.status).not.toHaveBeenCalled();
    expect(JSON.parse(request.query.filters)).toEqual([mobile, germany, chrome]);
  });

  it("expands with no ad-hoc filters at all", async () => {
    const { request } = await run({ segment_id: 7 });
    expect(JSON.parse(request.query.filters)).toEqual([mobile, germany]);
  });

  it("rejects a malformed segment_id", async () => {
    const { reply } = await run({ segment_id: "seven" });
    expect(reply.statusCode).toBe(400);
    expect(reply.payload.error).toBe("Invalid segment_id");
  });

  it("answers 404 for a segment outside the site", async () => {
    state.loaded = null;
    const { reply } = await run({ segment_id: "7" });
    expect(reply.statusCode).toBe(404);
  });

  it("hides a private segment from a public-dashboard viewer but expands a public one", async () => {
    state.actor = { userId: null, hasSiteAccess: false, isAdmin: false };
    const privateResult = await run({ segment_id: "7" });
    expect(privateResult.reply.statusCode).toBe(404);

    state.loaded!.segment.isPublic = true;
    const publicResult = await run({ segment_id: "7" });
    expect(publicResult.reply.status).not.toHaveBeenCalled();
    expect(JSON.parse(publicResult.request.query.filters)).toEqual([mobile, germany]);
  });

  it("requires segments:read from a scoped bearer credential, even when the route only needs analytics:read", async () => {
    const scoped = { bearerAuth: true, bearerStatements: { analytics: ["read"] } };
    const denied = await run({ segment_id: "7" }, { siteId: "1" }, scoped);
    expect(denied.reply.statusCode).toBe(403);
    expect(denied.reply.payload).toEqual({ error: "Insufficient scope", required: "segments:read" });

    const allowed = await run({ segment_id: "7" }, { siteId: "1" }, { bearerAuth: true, bearerStatements: { segments: ["read"] } });
    expect(allowed.reply.status).not.toHaveBeenCalled();

    const legacy = await run({ segment_id: "7" }, { siteId: "1" }, { bearerAuth: true, bearerStatements: null });
    expect(legacy.reply.status).not.toHaveBeenCalled();
  });

  it("rejects caller filters that fail validation instead of silently dropping them", async () => {
    const { reply } = await run({ segment_id: "7", filters: "not json" });
    expect(reply.statusCode).toBe(400);
    expect(reply.payload.error).toBe("Invalid filters");
  });
});
