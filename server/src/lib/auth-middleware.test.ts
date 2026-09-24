import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkApiKey: vi.fn(),
  getSessionFromReq: vi.fn(),
  getUserHasAccessToSite: vi.fn(),
  getUserHasAdminAccessToSite: vi.fn(),
  getUserHasAccessToSitePublic: vi.fn(),
  getUserIsInOrg: vi.fn(),
  getIsUserAdmin: vi.fn(),
}));

vi.mock("./auth-utils.js", () => mocks);
vi.mock("../db/postgres/postgres.js", () => ({
  db: { query: { member: { findFirst: vi.fn(async () => null) } } },
}));
vi.mock("./siteConfig.js", () => ({ siteConfig: { resolveSiteId: vi.fn(async () => null) } }));

import {
  allowPublicSiteAccess,
  requireAuth,
  requireOrgMember,
  requireSiteAccess,
  requireSiteAdminAccess,
  resolveSiteId,
} from "./auth-middleware.js";
import type { ScopeStatements } from "./scopes.js";

const bearer = { authorization: "Bearer rb_key" };

function bearerResult(statements: ScopeStatements | null, role = "member") {
  return { valid: true, role, userId: "user_1", statements };
}

const invalidResult = { valid: false, role: null, statements: null };

describe("auth middleware scope enforcement", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.getSessionFromReq.mockResolvedValue(null);
    mocks.getUserHasAccessToSite.mockResolvedValue(false);
    mocks.getUserHasAdminAccessToSite.mockResolvedValue(false);
    mocks.getUserHasAccessToSitePublic.mockResolvedValue(false);
    mocks.getUserIsInOrg.mockResolvedValue(false);
    mocks.getIsUserAdmin.mockResolvedValue(false);
    mocks.checkApiKey.mockResolvedValue(invalidResult);

    app = Fastify();
    app.get(
      "/sites/:siteId/goals",
      { preHandler: [resolveSiteId, requireSiteAccess({ resource: "goals", action: "read" })] as any },
      async () => ({ ok: true })
    );
    app.post(
      "/sites/:siteId/goals",
      { preHandler: [resolveSiteId, requireSiteAccess({ resource: "goals", action: "write" })] as any },
      async () => ({ ok: true })
    );
    app.delete(
      "/sites/:siteId",
      { preHandler: [resolveSiteId, requireSiteAdminAccess({ resource: "sites", action: "write" })] as any },
      async () => ({ ok: true })
    );
    app.get(
      "/sites/:siteId/overview",
      { preHandler: [resolveSiteId, allowPublicSiteAccess({ resource: "analytics", action: "read" })] as any },
      async () => ({ ok: true })
    );
    app.get(
      "/organizations/:organizationId/members",
      { preHandler: [requireOrgMember({ resource: "org", action: "read" })] as any },
      async () => ({ ok: true })
    );
    app.post("/user/settings", { preHandler: [requireAuth("deny-scoped")] as any }, async () => ({ ok: true }));
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("rejects a scoped key missing the route's scope with a distinguishable 403", async () => {
    mocks.checkApiKey.mockResolvedValue(bearerResult({ goals: ["read"] }));

    const response = await app.inject({ method: "POST", url: "/sites/5/goals", headers: bearer });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "Insufficient scope", required: "goals:write" });
  });

  it("allows a scoped key on routes it has the scope for", async () => {
    mocks.checkApiKey.mockResolvedValue(bearerResult({ goals: ["read"] }));

    const response = await app.inject({ method: "GET", url: "/sites/5/goals", headers: bearer });

    expect(response.statusCode).toBe(200);
  });

  it("treats legacy credentials (null statements) as unrestricted", async () => {
    mocks.checkApiKey.mockResolvedValue(bearerResult(null));

    expect((await app.inject({ method: "POST", url: "/sites/5/goals", headers: bearer })).statusCode).toBe(200);
    // ...but scopes never elevate: a member-role legacy key still can't hit admin routes.
    expect((await app.inject({ method: "DELETE", url: "/sites/5", headers: bearer })).statusCode).toBe(403);
  });

  it("sessions bypass scopes entirely", async () => {
    mocks.checkApiKey.mockResolvedValue(invalidResult);
    mocks.getUserHasAccessToSite.mockResolvedValue(true);
    mocks.getSessionFromReq.mockResolvedValue({ user: { id: "session_user" } });

    const response = await app.inject({ method: "POST", url: "/sites/5/goals" });

    expect(response.statusCode).toBe(200);
  });

  it("allows Better Auth system admins on site-admin routes without organization-admin access", async () => {
    mocks.getIsUserAdmin.mockResolvedValue(true);
    mocks.getSessionFromReq.mockResolvedValue({ user: { id: "system_admin", role: "admin" } });

    const response = await app.inject({ method: "DELETE", url: "/sites/5" });

    expect(response.statusCode).toBe(200);
    expect(mocks.getUserHasAdminAccessToSite).not.toHaveBeenCalled();
  });

  it("falls through to session access when the bearer scope is insufficient", async () => {
    mocks.checkApiKey.mockResolvedValue(bearerResult({ goals: ["read"] }));
    mocks.getUserHasAccessToSite.mockResolvedValue(true);
    mocks.getSessionFromReq.mockResolvedValue({ user: { id: "session_user" } });

    const response = await app.inject({ method: "POST", url: "/sites/5/goals", headers: bearer });

    expect(response.statusCode).toBe(200);
  });

  it("admin guard requires both the admin role and the scope", async () => {
    mocks.checkApiKey.mockResolvedValue(bearerResult({ sites: ["write"] }, "admin"));
    expect((await app.inject({ method: "DELETE", url: "/sites/5", headers: bearer })).statusCode).toBe(200);

    mocks.checkApiKey.mockResolvedValue(bearerResult({ goals: ["write"] }, "admin"));
    const wrongScope = await app.inject({ method: "DELETE", url: "/sites/5", headers: bearer });
    expect(wrongScope.statusCode).toBe(403);
    expect(wrongScope.json().error).toBe("Insufficient scope");

    mocks.checkApiKey.mockResolvedValue(bearerResult({ sites: ["write"] }, "member"));
    const wrongRole = await app.inject({ method: "DELETE", url: "/sites/5", headers: bearer });
    expect(wrongRole.statusCode).toBe(403);
    expect(wrongRole.json().error).toBe("Forbidden");
  });

  it("deny-scoped routes reject scoped credentials but allow unrestricted ones", async () => {
    mocks.checkApiKey.mockResolvedValue(bearerResult({ analytics: ["read"] }));
    const scoped = await app.inject({ method: "POST", url: "/user/settings", headers: bearer });
    expect(scoped.statusCode).toBe(403);
    expect(scoped.json().error).toBe("Insufficient scope");

    mocks.checkApiKey.mockResolvedValue(bearerResult(null));
    expect((await app.inject({ method: "POST", url: "/user/settings", headers: bearer })).statusCode).toBe(200);
  });

  it("org member guard enforces org scopes", async () => {
    mocks.checkApiKey.mockResolvedValue(bearerResult({ analytics: ["read"] }));

    const response = await app.inject({ method: "GET", url: "/organizations/org_1/members", headers: bearer });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "Insufficient scope", required: "org:read" });
  });

  it("threads the scope requirement into the public-access fallback", async () => {
    mocks.checkApiKey.mockResolvedValue(bearerResult({ goals: ["read"] }));
    mocks.getUserHasAccessToSitePublic.mockResolvedValue(true);

    const response = await app.inject({ method: "GET", url: "/sites/5/overview", headers: bearer });

    // Public helper said yes (e.g. the site is public) — request passes even
    // though the key lacks analytics:read; the helper received the requirement.
    expect(response.statusCode).toBe(200);
    expect(mocks.getUserHasAccessToSitePublic).toHaveBeenCalledWith(expect.anything(), "5", {
      resource: "analytics",
      action: "read",
    });
  });

  it("keeps returning 429 for rate-limited keys", async () => {
    mocks.checkApiKey.mockResolvedValue({ valid: false, role: null, rateLimited: true, statements: null });

    const response = await app.inject({ method: "GET", url: "/sites/5/goals", headers: bearer });

    expect(response.statusCode).toBe(429);
  });
});

describe("auth middleware rate limit reporting", () => {
  let app: FastifyInstance;

  const limit = (overrides: Record<string, unknown> = {}) => ({
    allowed: true,
    wouldHaveDenied: false,
    scope: null,
    burstLimit: 50,
    burstRemaining: 40,
    burstResetSeconds: 2,
    dailyLimit: 5000,
    dailyRemaining: 4000,
    dailyResetSeconds: 3600,
    retryAfterSeconds: 0,
    ...overrides,
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.getSessionFromReq.mockResolvedValue(null);
    mocks.getUserHasAccessToSite.mockResolvedValue(false);
    mocks.getIsUserAdmin.mockResolvedValue(false);

    app = Fastify();
    app.get("/sites/:siteId/goals", { preHandler: [requireSiteAccess()] as any }, async () => ({ ok: true }));
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("reports the remaining budget on a successful request", async () => {
    mocks.checkApiKey.mockResolvedValue({ ...bearerResult(null), rateLimit: limit() });

    const response = await app.inject({ method: "GET", url: "/sites/5/goals", headers: bearer });

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-ratelimit-burst-remaining"]).toBe("40");
    expect(response.headers["x-ratelimit-daily-limit"]).toBe("5000");
    expect(response.headers["x-ratelimit-daily-remaining"]).toBe("4000");
  });

  it("points RateLimit-* at whichever tier is closest to exhaustion", async () => {
    // 100/5000 daily left vs 40/50 burst: daily is the tier a client needs to
    // pace itself against.
    mocks.checkApiKey.mockResolvedValue({ ...bearerResult(null), rateLimit: limit({ dailyRemaining: 100 }) });

    const response = await app.inject({ method: "GET", url: "/sites/5/goals", headers: bearer });

    expect(response.headers["ratelimit-limit"]).toBe("5000");
    expect(response.headers["ratelimit-remaining"]).toBe("100");
    expect(response.headers["ratelimit-reset"]).toBe("3600");
  });

  it("names the tier and the wait on a daily rejection", async () => {
    mocks.checkApiKey.mockResolvedValue({
      valid: false,
      role: null,
      rateLimited: true,
      statements: null,
      rateLimit: limit({ allowed: false, scope: "daily", dailyRemaining: 0, retryAfterSeconds: 3600 }),
    });

    const response = await app.inject({ method: "GET", url: "/sites/5/goals", headers: bearer });

    expect(response.statusCode).toBe(429);
    expect(response.headers["retry-after"]).toBe("3600");
    expect(response.json()).toMatchObject({ scope: "daily", limit: 5000, retryAfter: 3600 });
  });

  it("omits the daily headers when the quota is unlimited", async () => {
    mocks.checkApiKey.mockResolvedValue({
      ...bearerResult(null),
      rateLimit: limit({ dailyLimit: 0, dailyRemaining: 0 }),
    });

    const response = await app.inject({ method: "GET", url: "/sites/5/goals", headers: bearer });

    // Self-hosted has no quota; advertising "0 remaining" would read as blocked.
    expect(response.headers["x-ratelimit-daily-limit"]).toBeUndefined();
    expect(response.headers["ratelimit-limit"]).toBe("50");
  });

  it("sends no rate limit headers for session-authenticated requests", async () => {
    mocks.checkApiKey.mockResolvedValue(invalidResult);
    mocks.getUserHasAccessToSite.mockResolvedValue(true);
    mocks.getSessionFromReq.mockResolvedValue({ user: { id: "user_1" } });

    const response = await app.inject({ method: "GET", url: "/sites/5/goals" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["ratelimit-limit"]).toBeUndefined();
  });
});
