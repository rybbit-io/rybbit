import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Exercises the segment auth rules end to end through the real handlers, with
 * the Postgres layer, the site-access lookup, and the org membership lookup
 * replaced by fixtures. The rule under test: anyone with site access can read
 * and apply; admins and owners create, edit, and delete anything; members
 * create their own and edit only those; viewers without access see only
 * public segments and can never write.
 */
const state = vi.hoisted(() => ({
  site: { organizationId: "org_1" } as { organizationId: string | null } | undefined,
  segments: [] as any[],
  siteAccess: false,
  membership: null as null | { role: string },
  systemAdmin: false,
  writes: [] as Array<{ op: string; values?: unknown }>,
}));

vi.mock("../../../db/postgres/postgres.js", () => {
  const returningAll = () => Promise.resolve(state.segments);
  return {
    db: {
      query: {
        sites: { findFirst: async () => state.site },
        segments: {
          findFirst: async () => state.segments[0],
          findMany: async () => state.segments,
        },
      },
      insert: () => ({
        values: (values: unknown) => {
          state.writes.push({ op: "insert", values });
          return { returning: () => Promise.resolve([{ segmentId: 99, ...(values as object) }]) };
        },
      }),
      update: () => ({
        set: (values: unknown) => {
          state.writes.push({ op: "update", values });
          return { where: () => ({ returning: () => Promise.resolve([{ ...state.segments[0], ...(values as object) }]) }) };
        },
      }),
      delete: () => ({
        where: () => {
          state.writes.push({ op: "delete" });
          return { returning: returningAll };
        },
      }),
    },
  };
});

vi.mock("../../../lib/auth-utils.js", () => ({
  getUserHasAccessToSite: async () => state.siteAccess,
  getIsUserAdmin: async () => state.systemAdmin,
}));

vi.mock("../../../lib/access.js", () => ({
  getOrgMembership: async () => state.membership,
  isOrgAdmin: (m: { role: string } | null) => m?.role === "admin" || m?.role === "owner",
}));

import { createSegment } from "./createSegment.js";
import { deleteSegment } from "./deleteSegment.js";
import { getSegment } from "./getSegment.js";
import { getSegments } from "./getSegments.js";
import { canEditSegment, canReadSegment, resolveSegmentActor, segmentBelongsToSite } from "./segmentAccess.js";
import { updateSegment } from "./updateSegment.js";

const filters = [{ parameter: "device_type", type: "equals", value: ["Mobile"] }];

const segmentRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  segmentId: 7,
  organizationId: "org_1",
  siteId: 1,
  userId: "member_1",
  name: "Mobile",
  description: null,
  filters,
  isPublic: false,
  type: "segment",
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
  ...overrides,
});

function fakeRequest(overrides: Record<string, unknown> = {}) {
  return {
    params: { siteId: "1", segmentId: "7" },
    body: {},
    query: {},
    headers: {},
    log: { error: vi.fn() },
    ...overrides,
  } as any;
}

function fakeReply() {
  const reply: any = { statusCode: 200 };
  reply.status = vi.fn((code: number) => {
    reply.statusCode = code;
    return reply;
  });
  reply.send = vi.fn((payload: unknown) => {
    reply.payload = payload;
    return reply;
  });
  return reply;
}

const asMember = (userId = "member_1") => {
  state.siteAccess = true;
  state.membership = { role: "member" };
  return fakeRequest({ user: { id: userId } });
};
const asAdmin = () => {
  state.siteAccess = true;
  state.membership = { role: "admin" };
  return fakeRequest({ user: { id: "admin_1" } });
};
const asViewer = () => {
  state.siteAccess = false;
  state.membership = null;
  return fakeRequest();
};

beforeEach(() => {
  state.site = { organizationId: "org_1" };
  state.segments = [];
  state.siteAccess = false;
  state.membership = null;
  state.systemAdmin = false;
  state.writes = [];
});

describe("resolveSegmentActor", () => {
  it("treats an organization API key as an admin of its own org only", async () => {
    const own = await resolveSegmentActor(fakeRequest({ apiKeyOrganizationId: "org_1" }), 1, "org_1");
    expect(own).toEqual({ userId: null, hasSiteAccess: true, isAdmin: true });

    const other = await resolveSegmentActor(fakeRequest({ apiKeyOrganizationId: "org_2" }), 1, "org_1");
    expect(other).toEqual({ userId: null, hasSiteAccess: false, isAdmin: false });
  });

  it("gives an anonymous viewer no access at all", async () => {
    expect(await resolveSegmentActor(fakeRequest(), 1, "org_1")).toEqual({
      userId: null,
      hasSiteAccess: false,
      isAdmin: false,
    });
  });

  it("marks org owners, org admins, and system admins as admins", async () => {
    state.siteAccess = true;
    state.membership = { role: "owner" };
    expect((await resolveSegmentActor(fakeRequest({ user: { id: "u" } }), 1, "org_1")).isAdmin).toBe(true);

    state.membership = { role: "member" };
    expect((await resolveSegmentActor(fakeRequest({ user: { id: "u" } }), 1, "org_1")).isAdmin).toBe(false);

    state.systemAdmin = true;
    expect((await resolveSegmentActor(fakeRequest({ user: { id: "u" } }), 1, "org_1")).isAdmin).toBe(true);
  });
});

describe("rule predicates", () => {
  const admin = { userId: "a", hasSiteAccess: true, isAdmin: true };
  const member = { userId: "member_1", hasSiteAccess: true, isAdmin: false };
  const viewer = { userId: null, hasSiteAccess: false, isAdmin: false };

  it("reads: site access sees everything, viewers see public only", () => {
    expect(canReadSegment({ isPublic: false }, member)).toBe(true);
    expect(canReadSegment({ isPublic: false }, viewer)).toBe(false);
    expect(canReadSegment({ isPublic: true }, viewer)).toBe(true);
  });

  it("edits: admins edit anything, members only their own, viewers nothing", () => {
    expect(canEditSegment({ userId: "someone_else" }, admin)).toBe(true);
    expect(canEditSegment({ userId: "member_1" }, member)).toBe(true);
    expect(canEditSegment({ userId: "someone_else" }, member)).toBe(false);
    expect(canEditSegment({ userId: null }, member)).toBe(false);
    expect(canEditSegment({ userId: null }, viewer)).toBe(false);
  });

  it("scopes a segment to its own site or its whole organization", () => {
    expect(segmentBelongsToSite({ siteId: 1, organizationId: "org_1" }, 1, "org_1")).toBe(true);
    expect(segmentBelongsToSite({ siteId: null, organizationId: "org_1" }, 2, "org_1")).toBe(true);
    expect(segmentBelongsToSite({ siteId: 2, organizationId: "org_1" }, 1, "org_1")).toBe(false);
    expect(segmentBelongsToSite({ siteId: null, organizationId: "org_2" }, 1, "org_1")).toBe(false);
  });
});

describe("GET /segments", () => {
  it("hides private segments from a public-dashboard viewer and marks nothing editable", async () => {
    state.segments = [segmentRow({ isPublic: true }), segmentRow({ segmentId: 8, isPublic: false })];
    const reply = fakeReply();
    await getSegments(asViewer(), reply);
    expect(reply.statusCode).toBe(200);
    expect(reply.payload.map((s: any) => s.segmentId)).toEqual([7]);
    expect(reply.payload[0].canEdit).toBe(false);
  });

  it("shows a member every segment and flags only their own as editable", async () => {
    state.segments = [segmentRow({ userId: "member_1" }), segmentRow({ segmentId: 8, userId: "admin_1" })];
    const reply = fakeReply();
    await getSegments(asMember(), reply);
    expect(reply.payload.map((s: any) => [s.segmentId, s.canEdit])).toEqual([
      [7, true],
      [8, false],
    ]);
  });

  it("returns 404 for a site that does not exist", async () => {
    state.site = undefined;
    const reply = fakeReply();
    await getSegments(asMember(), reply);
    expect(reply.statusCode).toBe(404);
  });
});

describe("GET /segments/:id", () => {
  it("answers 404, not 403, when a viewer asks for a private segment", async () => {
    state.segments = [segmentRow({ isPublic: false })];
    const reply = fakeReply();
    await getSegment(asViewer(), reply);
    expect(reply.statusCode).toBe(404);
  });

  it("refuses a segment that belongs to another site", async () => {
    state.segments = [segmentRow({ siteId: 2 })];
    const reply = fakeReply();
    await getSegment(asAdmin(), reply);
    expect(reply.statusCode).toBe(404);
  });
});

describe("POST /segments", () => {
  it("lets a member create a site segment and records them as its owner", async () => {
    const request = asMember();
    request.body = { name: "Mobile", filters };
    const reply = fakeReply();
    await createSegment(request, reply);
    expect(reply.statusCode).toBe(201);
    expect(state.writes[0]).toMatchObject({
      op: "insert",
      values: { organizationId: "org_1", siteId: 1, userId: "member_1", isPublic: false },
    });
    expect(reply.payload.canEdit).toBe(true);
  });

  it("refuses org-wide scope from a member but accepts it from an admin", async () => {
    const memberRequest = asMember();
    memberRequest.body = { name: "Paid", filters, scope: "organization" };
    const memberReply = fakeReply();
    await createSegment(memberRequest, memberReply);
    expect(memberReply.statusCode).toBe(403);
    expect(state.writes).toHaveLength(0);

    const adminRequest = asAdmin();
    adminRequest.body = { name: "Paid", filters, scope: "organization" };
    const adminReply = fakeReply();
    await createSegment(adminRequest, adminReply);
    expect(adminReply.statusCode).toBe(201);
    expect(state.writes[0]).toMatchObject({ values: { siteId: null } });
  });

  it("rejects a body whose filters would not survive the query validator", async () => {
    const request = asAdmin();
    request.body = { name: "Bad", filters: [{ parameter: "session_id", type: "equals", value: ["x"] }] };
    const reply = fakeReply();
    await createSegment(request, reply);
    expect(reply.statusCode).toBe(400);
    expect(reply.payload.error).toBe("Validation error");
    expect(state.writes).toHaveLength(0);
  });

  it("refuses a viewer even if the route guard let them through", async () => {
    const request = asViewer();
    request.body = { name: "Mobile", filters };
    const reply = fakeReply();
    await createSegment(request, reply);
    expect(reply.statusCode).toBe(403);
  });
});

describe("PUT /segments/:id", () => {
  it("lets a member edit their own segment", async () => {
    state.segments = [segmentRow({ userId: "member_1" })];
    const request = asMember();
    request.body = { name: "Renamed" };
    const reply = fakeReply();
    await updateSegment(request, reply);
    expect(reply.statusCode).toBe(200);
    expect(state.writes[0]).toMatchObject({ op: "update", values: { name: "Renamed" } });
  });

  it("stops a member editing someone else's segment", async () => {
    state.segments = [segmentRow({ userId: "admin_1" })];
    const request = asMember();
    request.body = { name: "Renamed" };
    const reply = fakeReply();
    await updateSegment(request, reply);
    expect(reply.statusCode).toBe(403);
    expect(state.writes).toHaveLength(0);
  });

  it("lets an admin edit anyone's segment", async () => {
    state.segments = [segmentRow({ userId: "member_1" })];
    const request = asAdmin();
    request.body = { isPublic: true };
    const reply = fakeReply();
    await updateSegment(request, reply);
    expect(reply.statusCode).toBe(200);
    expect(state.writes[0]).toMatchObject({ values: { isPublic: true } });
  });

  it("only an admin can widen a site segment to the whole organization", async () => {
    state.segments = [segmentRow({ userId: "member_1", siteId: 1 })];
    const request = asMember();
    request.body = { scope: "organization" };
    const reply = fakeReply();
    await updateSegment(request, reply);
    expect(reply.statusCode).toBe(403);
    expect(state.writes).toHaveLength(0);
  });

  it("validates replacement filters against the filter schema", async () => {
    state.segments = [segmentRow()];
    const request = asAdmin();
    request.body = { filters: [{ parameter: "browser", type: "equals", value: [] }] };
    const reply = fakeReply();
    await updateSegment(request, reply);
    expect(reply.statusCode).toBe(400);
  });
});

describe("DELETE /segments/:id", () => {
  it("member deletes own, not others; admin deletes any; viewer sees 404", async () => {
    state.segments = [segmentRow({ userId: "member_1" })];
    let reply = fakeReply();
    await deleteSegment(asMember(), reply);
    expect(reply.statusCode).toBe(200);
    expect(state.writes.map(w => w.op)).toEqual(["delete"]);

    state.writes = [];
    state.segments = [segmentRow({ userId: "admin_1" })];
    reply = fakeReply();
    await deleteSegment(asMember(), reply);
    expect(reply.statusCode).toBe(403);
    expect(state.writes).toHaveLength(0);

    reply = fakeReply();
    await deleteSegment(asAdmin(), reply);
    expect(reply.statusCode).toBe(200);

    state.writes = [];
    state.segments = [segmentRow({ isPublic: true })];
    reply = fakeReply();
    await deleteSegment(asViewer(), reply);
    expect(reply.statusCode).toBe(403);
    expect(state.writes).toHaveLength(0);
  });
});
