import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createApiKey: vi.fn(async () => ({ id: "key_1", key: "rb_org_new" })),
  apiKeyLimitForPlan: vi.fn(() => 50),
  countApiKeysForReference: vi.fn(async () => 0),
}));

vi.mock("../../lib/auth.js", () => ({ auth: { api: { createApiKey: mocks.createApiKey } } }));
vi.mock("../stripe/getSubscription.js", () => ({ getSubscriptionInner: vi.fn(async () => null) }));
vi.mock("../../lib/apiKeyLimits.js", () => ({
  apiKeyLimitForPlan: mocks.apiKeyLimitForPlan,
  countApiKeysForReference: mocks.countApiKeysForReference,
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
    mocks.countApiKeysForReference.mockResolvedValue(0);
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

  it("enforces the org's key-count limit", async () => {
    mocks.apiKeyLimitForPlan.mockReturnValue(5);
    mocks.countApiKeysForReference.mockResolvedValue(5);

    const response = await app.inject({
      method: "POST",
      url: "/organizations/org_1/api-keys",
      payload: { name: "one-too-many" },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error).toContain("limit of 5 API keys");
    expect(mocks.countApiKeysForReference).toHaveBeenCalledWith("org_1");
    expect(mocks.createApiKey).not.toHaveBeenCalled();
  });

  it("surfaces better-auth authorization failures with their status", async () => {
    mocks.createApiKey.mockRejectedValue(
      Object.assign(new Error("You are not a member of the organization that owns this API key."), {
        statusCode: 403,
      })
    );

    const response = await app.inject({
      method: "POST",
      url: "/organizations/org_1/api-keys",
      payload: { name: "outsider" },
    });

    expect(response.statusCode).toBe(403);
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
