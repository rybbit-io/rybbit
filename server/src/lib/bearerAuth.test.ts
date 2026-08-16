import { describe, expect, it, vi } from "vitest";
import type { RateLimitDecision } from "./apiRateLimit.js";
import {
  consumeBearerHandoff,
  extractBearerToken,
  registerBearerHandoff,
  releaseBearerHandoff,
  resolveBearerIdentity,
  type BearerResolverDeps,
} from "./bearerAuth.js";

const future = () => new Date(Date.now() + 3_600_000);
const past = () => new Date(Date.now() - 1_000);

function deps(overrides: Partial<BearerResolverDeps> = {}): BearerResolverDeps {
  return {
    verifyApiKey: async () => ({ valid: false, error: { code: "KEY_NOT_FOUND" } }),
    getOAuthSession: async () => null,
    ...overrides,
  };
}

describe("extractBearerToken", () => {
  it("mirrors the REST parser exactly", () => {
    expect(extractBearerToken("Bearer abc")).toBe("abc");
    expect(extractBearerToken("bearer abc")).toBeNull();
    expect(extractBearerToken("Bearer ")).toBeNull();
    expect(extractBearerToken("Bearer  abc")).toBe(" abc");
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken(["Bearer abc"])).toBeNull();
  });
});

describe("resolveBearerIdentity", () => {
  it("resolves a valid API key to its user and statements", async () => {
    const identity = await resolveBearerIdentity(
      "k",
      deps({ verifyApiKey: async () => ({ valid: true, key: { referenceId: "u1", permissions: { goals: ["read"] } } }) })
    );
    expect(identity).toEqual({ status: "valid", userId: "u1", statements: { goals: ["read"] } });
  });

  it("treats a null-permission key as unrestricted", async () => {
    const identity = await resolveBearerIdentity(
      "k",
      deps({ verifyApiKey: async () => ({ valid: true, key: { referenceId: "u1", permissions: null } }) })
    );
    expect(identity).toEqual({ status: "valid", userId: "u1", statements: null });
  });

  it("surfaces rate limiting without falling through to OAuth", async () => {
    const getOAuthSession = vi.fn(async () => null);
    const identity = await resolveBearerIdentity(
      "k",
      deps({ verifyApiKey: async () => ({ valid: false, error: { code: "RATE_LIMITED" } }), getOAuthSession })
    );
    expect(identity.status).toBe("rate_limited");
    expect(getOAuthSession).not.toHaveBeenCalled();
  });

  it("falls back to a valid OAuth token, honoring its scopes", async () => {
    const identity = await resolveBearerIdentity(
      "t",
      deps({ getOAuthSession: async () => ({ userId: "u2", accessTokenExpiresAt: future(), scopes: "openid analytics:read" }) })
    );
    expect(identity).toEqual({ status: "valid", userId: "u2", statements: { analytics: ["read"] } });
  });

  it("rejects an expired OAuth token", async () => {
    const identity = await resolveBearerIdentity(
      "t",
      deps({ getOAuthSession: async () => ({ userId: "u2", accessTokenExpiresAt: past(), scopes: "openid" }) })
    );
    expect(identity.status).toBe("invalid");
  });

  it("reports a verify error (vs invalid) when verification throws and OAuth misses", async () => {
    const identity = await resolveBearerIdentity(
      "k",
      deps({
        verifyApiKey: async () => {
          throw new Error("better-auth down");
        },
      })
    );
    expect(identity.status).toBe("verify_error");
  });
});

describe("resolveBearerIdentity rate limiting", () => {
  const decision = (overrides: Partial<RateLimitDecision> = {}): RateLimitDecision => ({
    allowed: true,
    wouldHaveDenied: false,
    scope: null,
    burstLimit: 50,
    burstRemaining: 49,
    burstResetSeconds: 1,
    dailyLimit: 5000,
    dailyRemaining: 4999,
    dailyResetSeconds: 3600,
    retryAfterSeconds: 0,
    ...overrides,
  });

  it("charges the organization for an org-owned key, not the key itself", async () => {
    const consumeRateLimit = vi.fn(async () => decision());
    const identity = await resolveBearerIdentity(
      "k",
      deps({
        verifyApiKey: async () => ({ valid: true, key: { referenceId: "org1", permissions: null, configId: "org" } }),
        consumeRateLimit,
      })
    );

    expect(consumeRateLimit).toHaveBeenCalledWith({ userId: undefined, organizationId: "org1" });
    expect(identity.status).toBe("valid");
    expect(identity.rateLimit?.dailyRemaining).toBe(4999);
  });

  it("charges OAuth access tokens on the same budget as API keys", async () => {
    const consumeRateLimit = vi.fn(async () => decision());
    const identity = await resolveBearerIdentity(
      "k",
      deps({ getOAuthSession: async () => ({ userId: "u1", accessTokenExpiresAt: future() }), consumeRateLimit })
    );

    expect(consumeRateLimit).toHaveBeenCalledWith({ userId: "u1", organizationId: undefined });
    expect(identity.status).toBe("valid");
  });

  it("rejects a denied request and carries the retry-after through", async () => {
    const identity = await resolveBearerIdentity(
      "k",
      deps({
        verifyApiKey: async () => ({ valid: true, key: { referenceId: "u1", permissions: null } }),
        consumeRateLimit: async () =>
          decision({ allowed: false, wouldHaveDenied: true, scope: "daily", retryAfterSeconds: 3600 }),
      })
    );

    expect(identity.status).toBe("rate_limited");
    expect(identity.userId).toBeUndefined();
    expect(identity.rateLimit?.scope).toBe("daily");
    expect(identity.rateLimit?.retryAfterSeconds).toBe(3600);
  });

  it("admits the request when the limiter itself fails", async () => {
    const identity = await resolveBearerIdentity(
      "k",
      deps({
        verifyApiKey: async () => ({ valid: true, key: { referenceId: "u1", permissions: null } }),
        consumeRateLimit: async () => {
          throw new Error("redis down");
        },
      })
    );

    // A broken limiter must not lock out valid credentials.
    expect(identity.status).toBe("valid");
    expect(identity.rateLimit).toBeUndefined();
  });
});

describe("bearer handoff", () => {
  it("returns the identity for a matching nonce and token", () => {
    const identity = { status: "valid" as const, userId: "u1", statements: null };
    const nonce = registerBearerHandoff("tok", identity);
    expect(consumeBearerHandoff(nonce, "tok")).toBe(identity);
    releaseBearerHandoff(nonce);
  });

  it("fails safe on a mismatched token, missing nonce, or wrong type", () => {
    const nonce = registerBearerHandoff("tok", { status: "valid", userId: "u1", statements: null });
    // Wrong token -> null (falls through to real verification)
    expect(consumeBearerHandoff(nonce, "other")).toBeNull();
    expect(consumeBearerHandoff("no-such-nonce", "tok")).toBeNull();
    expect(consumeBearerHandoff(undefined, "tok")).toBeNull();
    expect(consumeBearerHandoff(["array"], "tok")).toBeNull();
    expect(consumeBearerHandoff(nonce, null)).toBeNull();
    releaseBearerHandoff(nonce);
  });

  it("stops resolving after release", () => {
    const nonce = registerBearerHandoff("tok", { status: "valid", userId: "u1", statements: null });
    releaseBearerHandoff(nonce);
    expect(consumeBearerHandoff(nonce, "tok")).toBeNull();
  });

  it("covers only one call, so a JSON-RPC batch cannot ride on one charge", () => {
    const identity = { status: "valid" as const, userId: "u1", statements: null };
    const nonce = registerBearerHandoff("tok", identity);

    expect(consumeBearerHandoff(nonce, "tok")).toBe(identity);
    // A batched MCP request reuses one nonce for every tool call; the rest must
    // fall through to real verification so they are charged.
    expect(consumeBearerHandoff(nonce, "tok")).toBeNull();
    expect(consumeBearerHandoff(nonce, "tok")).toBeNull();

    releaseBearerHandoff(nonce);
  });
});
