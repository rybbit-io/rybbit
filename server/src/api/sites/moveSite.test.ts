import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  isCloud: true,
  site: null as Record<string, unknown> | null,
  targetOrg: null as Record<string, unknown> | null,
  targetMembership: null as { role: string } | null,
  targetOrgSiteCount: 0,
}));

const mocks = vi.hoisted(() => ({
  getSubscriptionInner: vi.fn(),
  applySiteMove: vi.fn(async () => {}),
}));

vi.mock("../../db/postgres/postgres.js", () => ({
  db: {
    query: {
      sites: { findFirst: vi.fn(async () => state.site) },
      organization: { findFirst: vi.fn(async () => state.targetOrg) },
      member: { findFirst: vi.fn(async () => state.targetMembership) },
    },
    // Only used to count the target organization's existing sites.
    select: vi.fn(() => ({
      from: () => ({
        where: async () => Array.from({ length: state.targetOrgSiteCount }, (_, i) => ({ siteId: i + 100 })),
      }),
    })),
  },
}));

vi.mock("../../lib/const.js", async importOriginal => {
  const actual = await importOriginal<typeof import("../../lib/const.js")>();
  return {
    ...actual,
    get IS_CLOUD() {
      return state.isCloud;
    },
  };
});

vi.mock("../stripe/getSubscription.js", () => ({
  getSubscriptionInner: mocks.getSubscriptionInner,
}));

vi.mock("./applySiteMove.js", () => ({
  applySiteMove: mocks.applySiteMove,
}));

import { moveSite } from "./moveSite.js";

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

// null means "explicitly absent" (anonymous caller / missing body field).
function makeRequest({
  siteId = "1",
  organizationId = "org_target",
  userId = "u_caller",
}: { siteId?: string; organizationId?: unknown; userId?: string | null } = {}) {
  return {
    params: { siteId },
    body: organizationId === null ? {} : { organizationId },
    user: userId === null ? undefined : { id: userId },
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  state.isCloud = true;
  state.site = { siteId: 1, organizationId: "org_source", domain: "example.com" };
  state.targetOrg = { id: "org_target", name: "Target Org" };
  state.targetMembership = { role: "admin" };
  state.targetOrgSiteCount = 0;
  mocks.getSubscriptionInner.mockResolvedValue({ planName: "pro-1m", status: "active", siteLimit: null });
});

// The adminSite middleware only vouches for the SOURCE site's organization. The
// handler's inline membership check on the TARGET organization is the sole gate
// preventing anyone from moving a site into an org they don't control.
describe("moveSite — target-organization authorization (sole gate)", () => {
  it("moves the site when the caller is an admin of the target org", async () => {
    state.targetMembership = { role: "admin" };
    const reply = replyStub();

    await moveSite(makeRequest(), reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.body).toEqual({ success: true, organizationId: "org_target" });
    expect(mocks.applySiteMove).toHaveBeenCalledWith(1, "org_source", "org_target");
  });

  it("moves the site when the caller is an owner of the target org", async () => {
    state.targetMembership = { role: "owner" };
    const reply = replyStub();

    await moveSite(makeRequest(), reply);

    expect(reply.statusCode).toBe(200);
    expect(mocks.applySiteMove).toHaveBeenCalledTimes(1);
  });

  it("rejects a plain member of the target org and writes no ownership change", async () => {
    state.targetMembership = { role: "member" };
    const reply = replyStub();

    await moveSite(makeRequest(), reply);

    expect(reply.statusCode).toBe(403);
    expect(reply.body.error).toBe("You must be an admin or owner of the target organization");
    expect(mocks.applySiteMove).not.toHaveBeenCalled();
  });

  it("rejects a caller with no membership in the target org and writes no ownership change", async () => {
    state.targetMembership = null;
    const reply = replyStub();

    await moveSite(makeRequest(), reply);

    expect(reply.statusCode).toBe(403);
    expect(reply.body.error).toBe("You are not a member of the target organization");
    expect(mocks.applySiteMove).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated request", async () => {
    const reply = replyStub();

    await moveSite(makeRequest({ userId: null }), reply);

    expect(reply.statusCode).toBe(401);
    expect(mocks.applySiteMove).not.toHaveBeenCalled();
  });
});

describe("moveSite — target-organization site limit (cloud)", () => {
  it("rejects the move when the target org is at its site limit", async () => {
    mocks.getSubscriptionInner.mockResolvedValue({ planName: "standard-250k", status: "active", siteLimit: 5 });
    state.targetOrgSiteCount = 5;
    const reply = replyStub();

    await moveSite(makeRequest(), reply);

    expect(reply.statusCode).toBe(403);
    expect(reply.body.error).toBe(
      "The target organization has reached its limit of 5 websites. Please upgrade it to add more."
    );
    expect(mocks.getSubscriptionInner).toHaveBeenCalledWith("org_target");
    expect(mocks.applySiteMove).not.toHaveBeenCalled();
  });

  it("allows the move while the target org is under its limit", async () => {
    mocks.getSubscriptionInner.mockResolvedValue({ planName: "standard-250k", status: "active", siteLimit: 5 });
    state.targetOrgSiteCount = 4;
    const reply = replyStub();

    await moveSite(makeRequest(), reply);

    expect(reply.statusCode).toBe(200);
    expect(mocks.applySiteMove).toHaveBeenCalledTimes(1);
  });

  it("treats a null siteLimit as unlimited", async () => {
    state.targetOrgSiteCount = 500;
    const reply = replyStub();

    await moveSite(makeRequest(), reply);

    expect(reply.statusCode).toBe(200);
  });

  it("skips the subscription check entirely when self-hosted", async () => {
    state.isCloud = false;
    state.targetOrgSiteCount = 500;
    const reply = replyStub();

    await moveSite(makeRequest(), reply);

    expect(reply.statusCode).toBe(200);
    expect(mocks.getSubscriptionInner).not.toHaveBeenCalled();
    expect(mocks.applySiteMove).toHaveBeenCalledWith(1, "org_source", "org_target");
  });
});

describe("moveSite — request and target validation", () => {
  it("rejects a move into the site's current organization", async () => {
    state.site = { siteId: 1, organizationId: "org_target", domain: "example.com" };
    const reply = replyStub();

    await moveSite(makeRequest(), reply);

    expect(reply.statusCode).toBe(400);
    expect(reply.body.error).toBe("Site is already in this organization");
    expect(mocks.applySiteMove).not.toHaveBeenCalled();
  });

  it("gives a non-member the same 403 whether or not the target org exists (no existence oracle)", async () => {
    state.targetMembership = null;

    state.targetOrg = { id: "org_target", name: "Target Org" };
    const existingOrgReply = replyStub();
    await moveSite(makeRequest(), existingOrgReply);

    state.targetOrg = null;
    const missingOrgReply = replyStub();
    await moveSite(makeRequest(), missingOrgReply);

    expect(existingOrgReply.statusCode).toBe(403);
    expect(missingOrgReply.statusCode).toBe(403);
    expect(missingOrgReply.body).toEqual(existingOrgReply.body);
    expect(missingOrgReply.body.error).toBe("You are not a member of the target organization");
    expect(mocks.applySiteMove).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing target org only after the membership check passes", async () => {
    // Only reachable with a (stale) admin membership row for the missing org, so the
    // 404 cannot be used by outsiders to probe org IDs.
    state.targetOrg = null;
    state.targetMembership = { role: "admin" };
    const reply = replyStub();

    await moveSite(makeRequest(), reply);

    expect(reply.statusCode).toBe(404);
    expect(reply.body.error).toBe("Target organization not found");
    expect(mocks.applySiteMove).not.toHaveBeenCalled();
  });

  it("returns 404 when the site does not exist", async () => {
    state.site = null;
    const reply = replyStub();

    await moveSite(makeRequest(), reply);

    expect(reply.statusCode).toBe(404);
    expect(reply.body.error).toBe("Site not found");
  });

  it("rejects non-positive or non-numeric site ids", async () => {
    for (const siteId of ["abc", "-1", "0"]) {
      const reply = replyStub();
      await moveSite(makeRequest({ siteId }), reply);
      expect(reply.statusCode).toBe(400);
      expect(reply.body.error).toContain("Invalid site ID");
    }
    expect(mocks.applySiteMove).not.toHaveBeenCalled();
  });

  it("rejects a missing or empty target organizationId", async () => {
    for (const organizationId of [null, ""]) {
      const reply = replyStub();
      await moveSite(makeRequest({ organizationId }), reply);
      expect(reply.statusCode).toBe(400);
      expect(reply.body.error).toBe("Invalid request data");
    }
    expect(mocks.applySiteMove).not.toHaveBeenCalled();
  });
});
