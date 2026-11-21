import Fastify, { type FastifyRequest } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  disabled: false,
  userId: "u1" as string | undefined,
  role: "admin" as string | null,
}));
const mocks = vi.hoisted(() => ({ create: vi.fn(), claim: vi.fn(), invalidate: vi.fn() }));
vi.mock("../../lib/const.js", () => ({
  get DISABLE_SIGNUP() {
    return state.disabled;
  },
}));
vi.mock("../../services/sites/siteConfigurationLifecycle.js", () => ({
  siteConfigurationLifecycle: { createUnclaimed: mocks.create, claim: mocks.claim },
  SiteLifecycleError: class extends Error {},
}));
vi.mock("../../lib/access.js", () => ({
  getOrgMembership: vi.fn(async () => (state.role ? { role: state.role } : null)),
  isOrgAdmin: (member: any) => ["owner", "admin"].includes(member?.role),
}));
vi.mock("../../lib/auth-utils.js", () => ({ invalidateSitesAccessCache: mocks.invalidate }));
import { createUnclaimedSite, unclaimedSiteRouteOptions } from "./createUnclaimedSite.js";
import { claimSite } from "./claimSite.js";

let app: ReturnType<typeof Fastify>;
beforeEach(async () => {
  vi.clearAllMocks();
  state.disabled = false;
  state.userId = "u1";
  state.role = "admin";
  mocks.create.mockResolvedValue({ siteId: 7, privateLinkKey: "aaaaaaaaaaaa", claimExpiresAt: "2026-09-12 12:00:00" });
  mocks.claim.mockResolvedValue({ siteId: 7, organizationId: "org_1" });
  app = Fastify();
  await app.register(rateLimit, { global: false });
  app.post("/sites/unclaimed", unclaimedSiteRouteOptions, createUnclaimedSite);
  app.post(
    "/sites/:siteId/claim",
    {
      preHandler: async (request: FastifyRequest) => {
        if (state.userId) request.user = { id: state.userId };
      },
    },
    claimSite
  );
});
afterEach(async () => {
  await app.close();
});
const claimBody = { privateLinkKey: "aaaaaaaaaaaa", organizationId: "org_1" };
describe("unclaimed site endpoints", () => {
  it("blocks public creation when signup is disabled", async () => {
    state.disabled = true;
    const response = await app.inject({ method: "POST", url: "/sites/unclaimed", payload: { domain: "acme.dev" } });
    expect(response.statusCode).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("limits one IP to ten creations per hour", async () => {
    for (let i = 0; i < 10; i++) {
      const response = await app.inject({ method: "POST", url: "/sites/unclaimed", payload: { domain: "acme.dev" } });
      expect(response.statusCode).toBe(201);
      expect(response.json().claimExpiresAt).toBe("2026-09-12T12:00:00.000Z");
    }
    const response = await app.inject({ method: "POST", url: "/sites/unclaimed", payload: { domain: "acme.dev" } });
    expect(response.statusCode).toBe(429);
    expect(mocks.create).toHaveBeenCalledTimes(10);
    expect(unclaimedSiteRouteOptions.config.rateLimit.skipOnError).toBe(false);
  });
  it.each([null, {}, { domain: 5 }, { domain: " " }, { domain: "a".repeat(254) }])(
    "rejects invalid creation input %j",
    async payload => {
      const response = await app.inject({ method: "POST", url: "/sites/unclaimed", payload: payload ?? undefined });
      expect(response.statusCode).toBe(400);
      expect(mocks.create).not.toHaveBeenCalled();
    }
  );
  it("rejects unauthenticated claims", async () => {
    state.userId = undefined;
    expect((await app.inject({ method: "POST", url: "/sites/7/claim", payload: claimBody })).statusCode).toBe(401);
    expect(mocks.claim).not.toHaveBeenCalled();
  });
  it.each([null, "member"])("rejects claims without target org admin rights (%s)", async role => {
    state.role = role;
    expect((await app.inject({ method: "POST", url: "/sites/7/claim", payload: claimBody })).statusCode).toBe(403);
    expect(mocks.claim).not.toHaveBeenCalled();
  });
  it("lets existing admins claim even when new signup is disabled", async () => {
    state.disabled = true;
    expect((await app.inject({ method: "POST", url: "/sites/7/claim", payload: claimBody })).statusCode).toBe(200);
    expect(mocks.claim).toHaveBeenCalledWith({ siteId: 7, userId: "u1", ...claimBody });
    expect(mocks.invalidate).toHaveBeenCalledWith("u1");
  });
});
