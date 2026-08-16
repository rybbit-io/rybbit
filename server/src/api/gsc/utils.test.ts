import crypto from "crypto";
import type { FastifyBaseLogger } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TEST_SECRET = "test-better-auth-secret-0123456789";

const state = vi.hoisted(() => ({
  secret: undefined as string | undefined,
  connections: [] as Record<string, unknown>[],
  updates: [] as Record<string, unknown>[],
}));

vi.mock("../../lib/const.js", async importOriginal => {
  const actual = await importOriginal<typeof import("../../lib/const.js")>();
  return {
    ...actual,
    get SECRET() {
      return state.secret;
    },
  };
});

vi.mock("../../db/postgres/postgres.js", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: async () => state.connections,
      }),
    }),
    update: () => ({
      set: (data: Record<string, unknown>) => ({
        where: async () => {
          state.updates.push(data);
        },
      }),
    }),
  },
}));

import { getGSCProperties, refreshGSCToken, signGSCState, verifyGSCState } from "./utils.js";

const TTL_MS = 15 * 60 * 1000;

function hmac(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("base64url");
}

function encodeBody(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

/** Mint a state for an arbitrary (possibly hostile) payload, correctly signed. */
function signedState(payload: unknown, secret = TEST_SECRET): string {
  const body = encodeBody(payload);
  return `${body}.${hmac(body, secret)}`;
}

function loggerStub() {
  return { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } as unknown as FastifyBaseLogger & {
    error: ReturnType<typeof vi.fn>;
  };
}

beforeEach(() => {
  state.secret = TEST_SECRET;
  state.connections = [];
  state.updates = [];
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("signGSCState / verifyGSCState", () => {
  it("round-trips the site and user the flow was minted for", () => {
    const verified = verifyGSCState(signGSCState(42, "user_abc"));

    expect(verified).not.toBeNull();
    expect(verified!.siteId).toBe(42);
    expect(verified!.userId).toBe("user_abc");
    expect(typeof verified!.ts).toBe("number");
  });

  it("emits a two-part base64url `body.signature` value", () => {
    const value = signGSCState(1, "user_abc");
    const parts = value.split(".");

    expect(parts).toHaveLength(2);
    for (const part of parts) {
      expect(part).toMatch(/^[A-Za-z0-9_-]+$/);
    }
    // The body is not encryption: it is readable, only tamper-evident.
    expect(JSON.parse(Buffer.from(parts[0], "base64url").toString())).toMatchObject({
      siteId: 1,
      userId: "user_abc",
    });
  });

  it("rejects a body swapped to another site while keeping the original signature (IDOR)", () => {
    const original = signGSCState(1, "user_abc");
    const [, signature] = original.split(".");
    const attackerBody = encodeBody({ siteId: 999, userId: "user_abc", ts: Date.now() });

    expect(verifyGSCState(`${attackerBody}.${signature}`)).toBeNull();
  });

  it("rejects a body swapped to another user while keeping the original signature", () => {
    const original = signGSCState(1, "victim_user");
    const [, signature] = original.split(".");
    const attackerBody = encodeBody({ siteId: 1, userId: "attacker_user", ts: Date.now() });

    expect(verifyGSCState(`${attackerBody}.${signature}`)).toBeNull();
  });

  it("rejects a forged signature of the correct length", () => {
    const [body, signature] = signGSCState(1, "user_abc").split(".");
    // Same length, one character flipped: exercises timingSafeEqual's compare path.
    const flipped = (signature[0] === "A" ? "B" : "A") + signature.slice(1);

    expect(flipped).toHaveLength(signature.length);
    expect(verifyGSCState(`${body}.${flipped}`)).toBeNull();
  });

  it("rejects a signature of the wrong length without throwing", () => {
    // crypto.timingSafeEqual throws on length mismatch; the length guard must
    // short-circuit before it is reached.
    const [body, signature] = signGSCState(1, "user_abc").split(".");

    expect(() => verifyGSCState(`${body}.${signature.slice(0, 5)}`)).not.toThrow();
    expect(verifyGSCState(`${body}.${signature.slice(0, 5)}`)).toBeNull();
    expect(verifyGSCState(`${body}.${signature}extra`)).toBeNull();
    expect(verifyGSCState(`${body}.`)).toBeNull();
    expect(verifyGSCState(`${body}.x`)).toBeNull();
  });

  it("rejects structurally malformed state values", () => {
    expect(verifyGSCState("")).toBeNull();
    expect(verifyGSCState("no-separator-here")).toBeNull();
    expect(verifyGSCState(".")).toBeNull();
    expect(verifyGSCState("a.b.c")).toBeNull();
    expect(verifyGSCState(`${signGSCState(1, "user_abc")}.extra`)).toBeNull();
  });

  it("rejects state signed with a different secret", () => {
    const foreign = signedState({ siteId: 1, userId: "user_abc", ts: Date.now() }, "some-other-deployment-secret");

    expect(verifyGSCState(foreign)).toBeNull();
  });

  it("rejects a correctly signed body that is not valid JSON", () => {
    // The attacker controls the body only if they hold the secret; this guards
    // the decode path against a corrupted (not forged) value.
    expect(
      verifyGSCState(
        `${Buffer.from("not json").toString("base64url")}.${hmac(Buffer.from("not json").toString("base64url"), TEST_SECRET)}`
      )
    ).toBeNull();

    const garbageBody = "!!!!not-base64url!!!!";
    expect(verifyGSCState(`${garbageBody}.${hmac(garbageBody, TEST_SECRET)}`)).toBeNull();
  });

  it("rejects correctly signed payloads that are not objects", () => {
    expect(verifyGSCState(signedState(null))).toBeNull();
    expect(verifyGSCState(signedState("user_abc"))).toBeNull();
    expect(verifyGSCState(signedState(123))).toBeNull();
    expect(verifyGSCState(signedState([1, "user_abc", Date.now()]))).toBeNull();
  });

  it("rejects payloads with missing or wrongly typed fields", () => {
    const now = Date.now();

    expect(verifyGSCState(signedState({ siteId: "1", userId: "user_abc", ts: now }))).toBeNull();
    expect(verifyGSCState(signedState({ siteId: 1, ts: now }))).toBeNull();
    expect(verifyGSCState(signedState({ siteId: 1, userId: 7, ts: now }))).toBeNull();
    expect(verifyGSCState(signedState({ siteId: 1, userId: "user_abc" }))).toBeNull();
    expect(verifyGSCState(signedState({ siteId: 1, userId: "user_abc", ts: String(now) }))).toBeNull();
    expect(verifyGSCState(signedState({ siteId: null, userId: "user_abc", ts: now }))).toBeNull();
    expect(verifyGSCState(signedState({}))).toBeNull();
  });

  it("keeps extra payload fields intact when the signature covers them", () => {
    const verified = verifyGSCState(signedState({ siteId: 5, userId: "user_abc", ts: Date.now(), extra: "kept" }));

    expect(verified).toMatchObject({ siteId: 5, userId: "user_abc", extra: "kept" });
  });

  it("accepts a state up to the TTL and rejects it one millisecond later", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const value = signGSCState(1, "user_abc");

    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z").getTime() + TTL_MS);
    expect(verifyGSCState(value)).not.toBeNull();

    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z").getTime() + TTL_MS + 1);
    expect(verifyGSCState(value)).toBeNull();
  });

  it("rejects a long-expired state", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const value = signGSCState(1, "user_abc");

    vi.setSystemTime(new Date("2026-01-02T00:00:00.000Z"));
    expect(verifyGSCState(value)).toBeNull();
  });

  it("accepts future-dated timestamps (no clock-skew ceiling)", () => {
    // Current behavior: only `now - ts > TTL` is checked, so a forward-dated ts
    // never expires. Only a holder of the signing secret can mint one.
    const future = signedState({ siteId: 1, userId: "user_abc", ts: Date.now() + 10 * 365 * 24 * 60 * 60 * 1000 });

    expect(verifyGSCState(future)).toMatchObject({ siteId: 1, userId: "user_abc" });
  });

  it("refuses to sign or verify when BETTER_AUTH_SECRET is unset", () => {
    const value = signGSCState(1, "user_abc");
    state.secret = undefined;

    expect(() => signGSCState(1, "user_abc")).toThrow(/BETTER_AUTH_SECRET is not set/);
    expect(() => verifyGSCState(value)).toThrow(/BETTER_AUTH_SECRET is not set/);
    // The malformed-shape guard runs first, so those still return null.
    expect(verifyGSCState("no-separator-here")).toBeNull();
  });
});

describe("refreshGSCToken", () => {
  const futureIso = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const staleIso = () => new Date(Date.now() - 60 * 60 * 1000).toISOString();

  it("returns null when the site has no GSC connection", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(await refreshGSCToken(1, loggerStub())).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the stored token without a network call while it is still fresh", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    state.connections = [{ siteId: 1, accessToken: "stored-token", refreshToken: "r1", expiresAt: futureIso() }];

    expect(await refreshGSCToken(1, loggerStub())).toBe("stored-token");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refreshes an expired token and persists the new access token and expiry", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ access_token: "fresh-token", expires_in: 3600 }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    state.connections = [{ siteId: 1, accessToken: "old-token", refreshToken: "r1", expiresAt: staleIso() }];

    expect(await refreshGSCToken(1, loggerStub())).toBe("fresh-token");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://oauth2.googleapis.com/token",
      expect.objectContaining({ method: "POST" })
    );
    expect(state.updates).toHaveLength(1);
    expect(state.updates[0].accessToken).toBe("fresh-token");
    // No new refresh_token in the response => the stored one is left alone.
    expect(state.updates[0]).not.toHaveProperty("refreshToken");
    expect(new Date(state.updates[0].expiresAt as string).getTime()).toBeGreaterThan(Date.now());
  });

  it("stores a rotated refresh token when Google returns one", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ access_token: "fresh-token", refresh_token: "r2", expires_in: 3600 }),
      }))
    );
    state.connections = [{ siteId: 1, accessToken: "old-token", refreshToken: "r1", expiresAt: staleIso() }];

    await refreshGSCToken(1, loggerStub());

    expect(state.updates[0].refreshToken).toBe("r2");
  });

  it("refreshes inside the five minute expiry buffer", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ access_token: "fresh-token", expires_in: 3600 }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    state.connections = [
      {
        siteId: 1,
        accessToken: "old-token",
        refreshToken: "r1",
        expiresAt: new Date(Date.now() + 60 * 1000).toISOString(),
      },
    ];

    expect(await refreshGSCToken(1, loggerStub())).toBe("fresh-token");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns null and logs when Google rejects the refresh", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 400, text: async () => "invalid_grant" }))
    );
    state.connections = [{ siteId: 1, accessToken: "old-token", refreshToken: "r1", expiresAt: staleIso() }];
    const logger = loggerStub();

    expect(await refreshGSCToken(1, logger)).toBeNull();
    expect(logger.error).toHaveBeenCalled();
    expect(state.updates).toHaveLength(0);
  });

  it("returns null when the request throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );
    state.connections = [{ siteId: 1, accessToken: "old-token", refreshToken: "r1", expiresAt: staleIso() }];
    const logger = loggerStub();

    expect(await refreshGSCToken(1, logger)).toBeNull();
    expect(logger.error).toHaveBeenCalled();
  });
});

describe("getGSCProperties", () => {
  it("returns the site URLs from a successful response and sends the bearer token", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ siteEntry: [{ siteUrl: "https://a.example/" }, { siteUrl: "sc-domain:b.example" }] }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await getGSCProperties("token-123", loggerStub())).toEqual(["https://a.example/", "sc-domain:b.example"]);
    expect(fetchMock).toHaveBeenCalledWith("https://www.googleapis.com/webmasters/v3/sites", {
      headers: { Authorization: "Bearer token-123" },
    });
  });

  it("returns an empty list when the response has no siteEntry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }))
    );

    expect(await getGSCProperties("token-123", loggerStub())).toEqual([]);
  });

  it("returns an empty list and logs on a non-OK response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 403, text: async () => "forbidden" }))
    );
    const logger = loggerStub();

    expect(await getGSCProperties("token-123", logger)).toEqual([]);
    expect(logger.error).toHaveBeenCalled();
  });

  it("returns an empty list when the request throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );
    const logger = loggerStub();

    expect(await getGSCProperties("token-123", logger)).toEqual([]);
    expect(logger.error).toHaveBeenCalled();
  });
});
