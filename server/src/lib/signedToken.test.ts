import { describe, expect, it, vi } from "vitest";

vi.mock("./const.js", () => ({ SECRET: "test-secret" }));

import { signExpiringPayload, signPayload, verifyExpiringPayload, verifySignedPayload } from "./signedToken.js";

describe("signed tokens", () => {
  it("round-trips a plain payload and rejects tampering", () => {
    const sig = signPayload("unsubscribe:a@b.com");
    expect(verifySignedPayload("unsubscribe:a@b.com", sig)).toBe(true);
    expect(verifySignedPayload("unsubscribe:evil@b.com", sig)).toBe(false);
    expect(verifySignedPayload("unsubscribe:a@b.com", sig + "x")).toBe(false);
    expect(verifySignedPayload("unsubscribe:a@b.com", "")).toBe(false);
  });

  it("expiring tokens verify within the TTL and fail after it", () => {
    const { exp, sig } = signExpiringPayload("check-install:42:acme.com", 3600);
    expect(verifyExpiringPayload("check-install:42:acme.com", exp, sig)).toBe(true);
    expect(verifyExpiringPayload("check-install:43:acme.com", exp, sig)).toBe(false);

    // A signature over an already-past expiry never verifies
    const past = Math.floor(Date.now() / 1000) - 10;
    const staleSig = signPayload(`check-install:42:acme.com:${past}`);
    expect(verifyExpiringPayload("check-install:42:acme.com", past, staleSig)).toBe(false);
  });

  it("rejects a forged expiry: exp is inside the signed payload", () => {
    const { exp, sig } = signExpiringPayload("unsubscribe:a@b.com", 60);
    expect(verifyExpiringPayload("unsubscribe:a@b.com", exp + 999999, sig)).toBe(false);
    expect(verifyExpiringPayload("unsubscribe:a@b.com", "not-a-number", sig)).toBe(false);
  });
});
