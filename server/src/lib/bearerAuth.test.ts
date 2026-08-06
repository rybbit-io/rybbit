import { describe, expect, it, vi } from "vitest";
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
});
