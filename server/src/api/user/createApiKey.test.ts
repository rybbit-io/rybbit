import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createApiKey: vi.fn(async () => ({ id: "key_1", key: "rb_new" })),
  getSessionFromReq: vi.fn(async () => ({ user: { id: "user_1" }, session: {} })),
}));

vi.mock("../../lib/auth.js", () => ({ auth: { api: { createApiKey: mocks.createApiKey } } }));
vi.mock("../../lib/auth-utils.js", () => ({ getSessionFromReq: mocks.getSessionFromReq }));
vi.mock("../stripe/getSubscription.js", () => ({ getSubscriptionInner: vi.fn(async () => null) }));
vi.mock("../../lib/const.js", () => ({
  IS_CLOUD: false,
  API_RATE_LIMIT_WINDOW: 60_000,
  PRO_API_RATE_LIMIT: 100,
  STANDARD_API_RATE_LIMIT: 10,
}));

import { createUserApiKey } from "./createApiKey.js";

describe("createUserApiKey — scoped permissions", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    app.post("/api-keys", createUserApiKey as any);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("forwards valid permissions to better-auth", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api-keys",
      payload: { name: "scoped", permissions: { goals: ["read", "write"], analytics: ["read"] } },
    });

    expect(response.statusCode).toBe(200);
    expect(mocks.createApiKey).toHaveBeenCalledWith({
      body: expect.objectContaining({
        name: "scoped",
        userId: "user_1",
        permissions: { goals: ["read", "write"], analytics: ["read"] },
      }),
    });
  });

  it("omits permissions entirely for full-access keys", async () => {
    const response = await app.inject({ method: "POST", url: "/api-keys", payload: { name: "full" } });

    expect(response.statusCode).toBe(200);
    const firstCall = mocks.createApiKey.mock.calls[0] as unknown as [{ body: Record<string, unknown> }];
    expect("permissions" in firstCall[0].body).toBe(false);
  });

  it("rejects an empty permissions object", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api-keys",
      payload: { name: "locked", permissions: {} },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toContain("full access");
    expect(mocks.createApiKey).not.toHaveBeenCalled();
  });

  it("rejects unknown resources and invalid actions", async () => {
    for (const permissions of [{ bogus: ["read"] }, { sql: ["write"] }, { goals: [] }]) {
      const response = await app.inject({ method: "POST", url: "/api-keys", payload: { name: "bad", permissions } });
      expect(response.statusCode).toBe(400);
    }
    expect(mocks.createApiKey).not.toHaveBeenCalled();
  });
});
