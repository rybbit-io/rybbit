import { beforeEach, describe, expect, it, vi } from "vitest";
import { INTERNAL_BEARER_HANDOFF_HEADER } from "./bearerAuth.js";

// What a *request* costs. Budget is denominated in API requests, but several
// guards resolve the same credential more than once per HTTP request, and the
// MCP proxy injects requests carrying a handoff nonce. These tests pin down how
// many units each of those shapes actually consumes.

const decision = {
  allowed: true,
  wouldHaveDenied: false,
  scope: null,
  burstLimit: 50,
  burstRemaining: 49,
  burstResetSeconds: 1,
  dailyLimit: 5_000,
  dailyRemaining: 4_999,
  dailyResetSeconds: 3_600,
  retryAfterSeconds: 0,
};

const verifyApiKey = vi.fn();
const consumeRateLimitForIdentity = vi.fn();

// The handoff registry is module state, and resetModules gives auth-utils a
// fresh copy of it — so the test has to register nonces through the same graph
// auth-utils is reading from.
async function loadModules(isCloud: boolean) {
  vi.resetModules();
  vi.doMock("./auth.js", () => ({
    auth: { api: { verifyApiKey, getMcpSession: vi.fn(async () => null), getSession: vi.fn(async () => null) } },
  }));
  vi.doMock("./apiRateLimitPolicy.js", () => ({ consumeRateLimitForIdentity }));
  vi.doMock("../db/postgres/postgres.js", () => ({ db: {} }));
  vi.doMock("./const.js", async importOriginal => ({
    ...(await importOriginal<typeof import("./const.js")>()),
    IS_CLOUD: isCloud,
  }));
  const { checkApiKey } = await import("./auth-utils.js");
  const { registerBearerHandoff, releaseBearerHandoff } = await import("./bearerAuth.js");
  return { checkApiKey, registerBearerHandoff, releaseBearerHandoff };
}

// An organization key checked against its own organization resolves without
// touching the database.
const orgRequest = (extraHeaders: Record<string, string> = {}) =>
  ({ headers: { authorization: "Bearer rb_org_key", ...extraHeaders }, query: {} }) as any;

describe("rate limit charging per request", () => {
  beforeEach(() => {
    verifyApiKey.mockReset();
    consumeRateLimitForIdentity.mockReset();
    verifyApiKey.mockResolvedValue({ valid: true, key: { referenceId: "org_a", permissions: null, configId: "org" } });
    consumeRateLimitForIdentity.mockResolvedValue(decision);
  });

  it("charges one unit no matter how many times a request resolves the credential", async () => {
    const { checkApiKey } = await loadModules(true);
    const req = orgRequest();

    // A guard, then its fallback, then a handler calling getUserIdFromRequest.
    await checkApiKey(req, { organizationId: "org_a" });
    await checkApiKey(req, { organizationId: "org_a" });
    await checkApiKey(req, { organizationId: "org_a" });

    expect(consumeRateLimitForIdentity).toHaveBeenCalledTimes(1);
  });

  it("charges separate requests separately", async () => {
    const { checkApiKey } = await loadModules(true);

    await checkApiKey(orgRequest(), { organizationId: "org_a" });
    await checkApiKey(orgRequest(), { organizationId: "org_a" });

    expect(consumeRateLimitForIdentity).toHaveBeenCalledTimes(2);
  });

  it("reports the memoized decision on every resolution", async () => {
    const { checkApiKey } = await loadModules(true);
    const req = orgRequest();

    const first = await checkApiKey(req, { organizationId: "org_a" });
    const second = await checkApiKey(req, { organizationId: "org_a" });

    expect(first.rateLimit).toEqual(decision);
    expect(second.rateLimit).toEqual(decision);
  });

  it("does not charge again for the call the MCP gate already paid for", async () => {
    const { checkApiKey, registerBearerHandoff, releaseBearerHandoff } = await loadModules(true);
    const nonce = registerBearerHandoff("rb_org_key", {
      status: "valid",
      organizationId: "org_a",
      statements: null,
      rateLimit: decision,
    });

    const req = orgRequest({ [INTERNAL_BEARER_HANDOFF_HEADER]: nonce });
    const result = await checkApiKey(req, { organizationId: "org_a" });
    // The handler resolving the credential again must not turn into a charge.
    await checkApiKey(req, { organizationId: "org_a" });

    expect(consumeRateLimitForIdentity).not.toHaveBeenCalled();
    expect(result.rateLimit).toEqual(decision);
    releaseBearerHandoff(nonce);
  });

  it("charges the second injected request of a batched MCP call", async () => {
    const { checkApiKey, registerBearerHandoff, releaseBearerHandoff } = await loadModules(true);
    const nonce = registerBearerHandoff("rb_org_key", {
      status: "valid",
      organizationId: "org_a",
      statements: null,
      rateLimit: decision,
    });

    // Every tool call in one JSON-RPC batch reuses the same nonce, but each is
    // its own injected request; only the first rides on the gate's charge.
    await checkApiKey(orgRequest({ [INTERNAL_BEARER_HANDOFF_HEADER]: nonce }), { organizationId: "org_a" });
    await checkApiKey(orgRequest({ [INTERNAL_BEARER_HANDOFF_HEADER]: nonce }), { organizationId: "org_a" });
    await checkApiKey(orgRequest({ [INTERNAL_BEARER_HANDOFF_HEADER]: nonce }), { organizationId: "org_a" });

    expect(consumeRateLimitForIdentity).toHaveBeenCalledTimes(2);
    releaseBearerHandoff(nonce);
  });

  it("does not meter self-hosted instances at all", async () => {
    const { checkApiKey } = await loadModules(false);

    const result = await checkApiKey(orgRequest(), { organizationId: "org_a" });

    // Self-hosted has no plans and must not take a Redis dependency on the
    // authentication path.
    expect(consumeRateLimitForIdentity).not.toHaveBeenCalled();
    expect(result.valid).toBe(true);
    expect(result.rateLimit).toBeUndefined();
  });
});
