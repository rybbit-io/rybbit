import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkApiKey: vi.fn(),
  getSessionFromReq: vi.fn(),
  getUserSiteRole: vi.fn(),
  getSiteIsPubliclyReadable: vi.fn(),
  getIsUserAdmin: vi.fn(),
  getUserOrgRole: vi.fn(),
}));

vi.mock("./auth-utils.js", () => mocks);
vi.mock("../db/postgres/postgres.js", () => ({
  db: { query: { member: { findFirst: vi.fn(async () => null) } } },
}));
vi.mock("./siteConfig.js", () => ({ siteConfig: { resolveSiteId: vi.fn(async () => null) } }));

import { requireAuth, requireOrgPermission, requireSitePermission, resolveSiteId } from "./auth-middleware.js";
import type { ScopeStatements } from "./scopes.js";

const bearer = { authorization: "Bearer rb_key" };

function bearerResult(statements: ScopeStatements | null, role = "member") {
  return { valid: true, role, userId: "user_1", statements };
}

const invalidResult = { valid: false, role: null, statements: null };

describe("permission guards", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.getSessionFromReq.mockResolvedValue(null);
    mocks.getUserSiteRole.mockResolvedValue(null);
    mocks.getSiteIsPubliclyReadable.mockResolvedValue(false);
    mocks.getIsUserAdmin.mockResolvedValue(false);
    mocks.checkApiKey.mockResolvedValue(invalidResult);
    mocks.getUserOrgRole.mockResolvedValue(null);

    app = Fastify();
    app.get(
      "/sites/:siteId/goals",
      { preHandler: [resolveSiteId, requireSitePermission("goals:read")] as any },
      async request => ({ role: request.accessRole ?? null })
    );
    app.post(
      "/sites/:siteId/goals",
      { preHandler: [resolveSiteId, requireSitePermission("goals:write")] as any },
      async () => ({ ok: true })
    );
    app.delete(
      "/sites/:siteId",
      { preHandler: [resolveSiteId, requireSitePermission("sites:delete")] as any },
      async () => ({ ok: true })
    );
    app.get(
      "/sites/:siteId/overview",
      { preHandler: [resolveSiteId, requireSitePermission("analytics:read", { allowPublic: true })] as any },
      async () => ({ ok: true })
    );
    app.get(
      "/organizations/:organizationId/members",
      { preHandler: [requireOrgPermission("org:read")] as any },
      async () => ({ ok: true })
    );
    app.post(
      "/organizations/:organizationId/teams",
      { preHandler: [requireOrgPermission("teams:manage")] as any },
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
    expect(response.json()).toEqual({ role: "member" });
  });

  it("treats legacy credentials (null statements) as unrestricted", async () => {
    mocks.checkApiKey.mockResolvedValue(bearerResult(null));

    expect((await app.inject({ method: "POST", url: "/sites/5/goals", headers: bearer })).statusCode).toBe(200);
    // ...but scopes never elevate: a member-role legacy key still can't hit admin routes.
    const deleted = await app.inject({ method: "DELETE", url: "/sites/5", headers: bearer });
    expect(deleted.statusCode).toBe(403);
    expect(deleted.json()).toEqual({ error: "Insufficient role", required: "admin" });
  });

  it("sessions bypass scopes entirely", async () => {
    mocks.getUserSiteRole.mockResolvedValue("member");
    mocks.getSessionFromReq.mockResolvedValue({ user: { id: "session_user" } });

    const response = await app.inject({ method: "POST", url: "/sites/5/goals" });

    expect(response.statusCode).toBe(200);
  });

  it("admits a session whose role on the site holds the permission, and only that", async () => {
    mocks.getSessionFromReq.mockResolvedValue({ user: { id: "session_user" } });

    mocks.getUserSiteRole.mockResolvedValue("admin");
    expect((await app.inject({ method: "DELETE", url: "/sites/5" })).statusCode).toBe(200);

    mocks.getUserSiteRole.mockResolvedValue("member");
    const denied = await app.inject({ method: "DELETE", url: "/sites/5" });
    expect(denied.statusCode).toBe(403);
    expect(denied.json()).toEqual({ error: "Insufficient role", required: "admin" });

    mocks.getUserSiteRole.mockResolvedValue(null);
    const outsider = await app.inject({ method: "DELETE", url: "/sites/5" });
    expect(outsider.statusCode).toBe(403);
    expect(outsider.json()).toEqual({ error: "Forbidden" });
  });

  it("falls through to session access when the bearer scope is insufficient", async () => {
    mocks.checkApiKey.mockResolvedValue(bearerResult({ goals: ["read"] }));
    mocks.getUserSiteRole.mockResolvedValue("member");
    mocks.getSessionFromReq.mockResolvedValue({ user: { id: "session_user" } });

    const response = await app.inject({ method: "POST", url: "/sites/5/goals", headers: bearer });

    expect(response.statusCode).toBe(200);
  });

  it("admin permissions require both the admin role and the scope", async () => {
    mocks.checkApiKey.mockResolvedValue(bearerResult({ sites: ["write"] }, "admin"));
    expect((await app.inject({ method: "DELETE", url: "/sites/5", headers: bearer })).statusCode).toBe(200);

    mocks.checkApiKey.mockResolvedValue(bearerResult({ goals: ["write"] }, "admin"));
    const wrongScope = await app.inject({ method: "DELETE", url: "/sites/5", headers: bearer });
    expect(wrongScope.statusCode).toBe(403);
    expect(wrongScope.json().error).toBe("Insufficient scope");

    mocks.checkApiKey.mockResolvedValue(bearerResult({ sites: ["write"] }, "member"));
    const wrongRole = await app.inject({ method: "DELETE", url: "/sites/5", headers: bearer });
    expect(wrongRole.statusCode).toBe(403);
    expect(wrongRole.json().error).toBe("Insufficient role");
  });

  it("deny-scoped routes reject scoped credentials but allow unrestricted ones", async () => {
    mocks.checkApiKey.mockResolvedValue(bearerResult({ analytics: ["read"] }));
    const scoped = await app.inject({ method: "POST", url: "/user/settings", headers: bearer });
    expect(scoped.statusCode).toBe(403);
    expect(scoped.json().error).toBe("Insufficient scope");

    mocks.checkApiKey.mockResolvedValue(bearerResult(null));
    expect((await app.inject({ method: "POST", url: "/user/settings", headers: bearer })).statusCode).toBe(200);
  });

  it("org guard enforces org scopes", async () => {
    mocks.checkApiKey.mockResolvedValue(bearerResult({ analytics: ["read"] }));

    const response = await app.inject({ method: "GET", url: "/organizations/org_1/members", headers: bearer });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "Insufficient scope", required: "org:read" });
  });

  it("org guard reads the session's organization role", async () => {
    mocks.getSessionFromReq.mockResolvedValue({ user: { id: "session_user" } });

    mocks.getUserOrgRole.mockResolvedValue("member");
    expect((await app.inject({ method: "GET", url: "/organizations/org_1/members" })).statusCode).toBe(200);
    const member = await app.inject({ method: "POST", url: "/organizations/org_1/teams" });
    expect(member.statusCode).toBe(403);
    expect(member.json()).toEqual({ error: "Insufficient role", required: "admin" });

    mocks.getUserOrgRole.mockResolvedValue("admin");
    expect((await app.inject({ method: "POST", url: "/organizations/org_1/teams" })).statusCode).toBe(200);

    mocks.getUserOrgRole.mockResolvedValue(null);
    const outsider = await app.inject({ method: "GET", url: "/organizations/org_1/members" });
    expect(outsider.statusCode).toBe(403);
    expect(outsider.json()).toEqual({ error: "You are not a member of this organization" });
  });

  it("org guard answers 401 when there is no credential at all", async () => {
    expect((await app.inject({ method: "GET", url: "/organizations/org_1/members" })).statusCode).toBe(401);
  });

  it("admits anyone on a public site, even a key lacking the scope", async () => {
    mocks.checkApiKey.mockResolvedValue(bearerResult({ goals: ["read"] }));
    mocks.getSiteIsPubliclyReadable.mockResolvedValue(true);

    // The site is public: the anonymous baseline applies regardless of the key.
    const response = await app.inject({ method: "GET", url: "/sites/5/overview", headers: bearer });

    expect(response.statusCode).toBe(200);
  });

  it("keeps the scope error on a private site for a key lacking the scope", async () => {
    mocks.checkApiKey.mockResolvedValue(bearerResult({ goals: ["read"] }));

    const response = await app.inject({ method: "GET", url: "/sites/5/overview", headers: bearer });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "Insufficient scope", required: "analytics:read" });
  });

  it("does not consult public access on routes that do not allow it", async () => {
    mocks.getSiteIsPubliclyReadable.mockResolvedValue(true);

    expect((await app.inject({ method: "GET", url: "/sites/5/goals" })).statusCode).toBe(403);
    expect(mocks.getSiteIsPubliclyReadable).not.toHaveBeenCalled();
  });

  it("re-reads the role for anything beyond reading, and uses the cache for reads", async () => {
    mocks.getSessionFromReq.mockResolvedValue({ user: { id: "session_user" } });
    mocks.getUserSiteRole.mockResolvedValue("admin");

    await app.inject({ method: "GET", url: "/sites/5/goals" });
    expect(mocks.getUserSiteRole).toHaveBeenLastCalledWith(expect.anything(), "5", { fresh: false });
    expect(mocks.checkApiKey).toHaveBeenLastCalledWith(expect.anything(), { siteId: "5", fresh: false });

    await app.inject({ method: "DELETE", url: "/sites/5" });
    expect(mocks.getUserSiteRole).toHaveBeenLastCalledWith(expect.anything(), "5", { fresh: true });
    expect(mocks.checkApiKey).toHaveBeenLastCalledWith(expect.anything(), { siteId: "5", fresh: true });
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
    mocks.getUserSiteRole.mockResolvedValue(null);
    mocks.getSiteIsPubliclyReadable.mockResolvedValue(false);
    mocks.getIsUserAdmin.mockResolvedValue(false);

    app = Fastify();
    app.get("/sites/:siteId/goals", { preHandler: [requireSitePermission("goals:read")] as any }, async () => ({
      ok: true,
    }));
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
    mocks.getUserSiteRole.mockResolvedValue("member");
    mocks.getSessionFromReq.mockResolvedValue({ user: { id: "user_1" } });

    const response = await app.inject({ method: "GET", url: "/sites/5/goals" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["ratelimit-limit"]).toBeUndefined();
  });
});
