import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createApiKey: vi.fn(async () => ({ id: "key_1", key: "rb_org_new" })),
  apiKeyLimitForPlan: vi.fn(() => 50),
  createApiKeyWithinLimit: vi.fn(
    async (
      _ref: string,
      _limit: number,
      create: () => Promise<unknown>
    ): Promise<{ allowed: boolean; result?: unknown }> => ({
      allowed: true,
      result: await create(),
    })
  ),
}));

vi.mock("../../lib/auth.js", () => ({ auth: { api: { createApiKey: mocks.createApiKey } } }));
vi.mock("../stripe/getSubscription.js", () => ({ getSubscriptionInner: vi.fn(async () => null) }));
vi.mock("../../lib/apiKeyLimits.js", () => ({
  apiKeyLimitForPlan: mocks.apiKeyLimitForPlan,
  createApiKeyWithinLimit: mocks.createApiKeyWithinLimit,
}));
vi.mock("../../lib/const.js", () => ({
  IS_CLOUD: false,
  API_RATE_LIMIT_WINDOW: 60_000,
  PRO_API_RATE_LIMIT: 100,
  STANDARD_API_RATE_LIMIT: 10,
}));

import { createOrgApiKey } from "./createOrgApiKey.js";

describe("createOrgApiKey", () => {
  let app: FastifyInstance;
  // What the route guard would have attached: a session or user-API-key user.
  let currentUser: { id: string } | null;

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.createApiKey.mockResolvedValue({ id: "key_1", key: "rb_org_new" });
    mocks.apiKeyLimitForPlan.mockReturnValue(50);
    mocks.createApiKeyWithinLimit.mockImplementation(async (_ref, _limit, create) => ({
      allowed: true,
      result: await create(),
    }));
    currentUser = { id: "user_1" };
    app = Fastify();
    app.addHook("preHandler", async req => {
      if (currentUser) (req as any).user = currentUser;
    });
    app.post("/organizations/:organizationId/api-keys", createOrgApiKey as any);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("creates an org-owned key: org config, acting user, createdBy metadata", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/organizations/org_1/api-keys",
      payload: { name: "ci-deploys", permissions: { analytics: ["read"] } },
    });

    expect(response.statusCode).toBe(200);
    expect(mocks.createApiKey).toHaveBeenCalledWith({
      body: expect.objectContaining({
        name: "ci-deploys",
        configId: "org",
        organizationId: "org_1",
        userId: "user_1",
        metadata: { createdBy: "user_1" },
        permissions: { analytics: ["read"] },
      }),
    });
  });

  it("rejects creation without a signed-in user (org keys cannot mint keys)", async () => {
    currentUser = null;

    const response = await app.inject({
      method: "POST",
      url: "/organizations/org_1/api-keys",
      payload: { name: "nope" },
    });

    expect(response.statusCode).toBe(401);
    expect(mocks.createApiKey).not.toHaveBeenCalled();
  });

  it("enforces the org's key-count limit through the atomic reservation", async () => {
    mocks.apiKeyLimitForPlan.mockReturnValue(5);
    mocks.createApiKeyWithinLimit.mockResolvedValue({ allowed: false });

    const response = await app.inject({
      method: "POST",
      url: "/organizations/org_1/api-keys",
      payload: { name: "one-too-many" },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error).toContain("limit of 5 API keys");
    expect(mocks.createApiKeyWithinLimit).toHaveBeenCalledWith("org_1", 5, expect.any(Function));
    expect(mocks.createApiKey).not.toHaveBeenCalled();
  });

  it("surfaces better-auth 4xx rejections with their status and message", async () => {
    mocks.createApiKey.mockRejectedValue(
      Object.assign(new Error("You are not a member of the organization that owns this API key."), {
        name: "APIError",
        statusCode: 403,
      })
    );

    const response = await app.inject({
      method: "POST",
      url: "/organizations/org_1/api-keys",
      payload: { name: "outsider" },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error).toContain("not a member");
  });

  it("never forwards arbitrary error internals to the client", async () => {
    mocks.createApiKey.mockRejectedValue(
      Object.assign(new Error("connect ECONNREFUSED 10.0.0.5:5432 (password=hunter2)"), { statusCode: 500 })
    );

    const response = await app.inject({
      method: "POST",
      url: "/organizations/org_1/api-keys",
      payload: { name: "boom" },
    });

    expect(response.statusCode).toBe(500);
    expect(response.json().error).toBe("Failed to create API key");
  });

  it("does not trust a 4xx statusCode on non-APIError exceptions", async () => {
    mocks.createApiKey.mockRejectedValue(Object.assign(new Error("internal detail"), { statusCode: 402 }));

    const response = await app.inject({
      method: "POST",
      url: "/organizations/org_1/api-keys",
      payload: { name: "boom" },
    });

    expect(response.statusCode).toBe(500);
    expect(response.json().error).toBe("Failed to create API key");
  });

  it("rejects invalid permissions", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/organizations/org_1/api-keys",
      payload: { name: "bad", permissions: { bogus: ["read"] } },
    });

    expect(response.statusCode).toBe(400);
    expect(mocks.createApiKey).not.toHaveBeenCalled();
  });
});
