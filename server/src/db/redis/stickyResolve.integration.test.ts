import { beforeEach, describe, expect, it } from "vitest";
import RedisMock from "ioredis-mock";
import { STICKY_RESOLVE_LUA } from "./stickyResolveLua.js";

// Behavioral tests for the stickyResolve Lua script, executed for real by
// ioredis-mock's embedded Lua runtime. This is the decision core of sticky
// identity re-attachment — TS-level mocks can't cover it.

const WINDOW_MS = 5 * 60 * 1000;
const SEEN_TTL_MS = 30 * 60 * 1000;
const ALIAS_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CANDIDATES = 32;

const SEEN_PREFIX = "sticky:seen:1:";
const ALIAS_PREFIX = "sticky:alias:1:";
const CAND_KEY = "sticky:cand:1::ua1";

interface StickyMockRedis {
  stickyResolve(...args: (string | number)[]): Promise<[string, string]>;
  zadd(key: string, score: number, member: string): Promise<unknown>;
  zrange(key: string, start: number, stop: number): Promise<string[]>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
  exists(key: string): Promise<number>;
  flushall(): Promise<unknown>;
}

let redis: StickyMockRedis;

function resolve(rawId: string, opts: { nowMs?: number; eligible?: boolean; uaKey?: string } = {}) {
  const candKey = opts.uaKey ?? CAND_KEY;
  return redis.stickyResolve(
    `${SEEN_PREFIX}${rawId}`,
    candKey,
    `${ALIAS_PREFIX}${rawId}`,
    rawId,
    opts.nowMs ?? 1_000_000,
    WINDOW_MS,
    SEEN_TTL_MS,
    ALIAS_TTL_MS,
    opts.eligible === false ? "0" : "1",
    SEEN_PREFIX,
    ALIAS_PREFIX,
    MAX_CANDIDATES
  );
}

describe("stickyResolve Lua script", () => {
  beforeEach(async () => {
    const client = new RedisMock();
    client.defineCommand("stickyResolve", { numberOfKeys: 3, lua: STICKY_RESOLVE_LUA });
    redis = client as unknown as StickyMockRedis;
    await redis.flushall();
  });

  it("registers a first-time datacenter visitor as identity and candidate", async () => {
    const [userId, outcome] = await resolve("userA");

    expect(userId).toBe("userA");
    expect(outcome).toBe("abstain_none");
    expect(await redis.exists(`${SEEN_PREFIX}userA`)).toBe(1);
    expect(await redis.zrange(CAND_KEY, 0, -1)).toEqual(["userA"]);
  });

  it("registers a residential visitor as identity but never as a rotation candidate", async () => {
    const [userId, outcome] = await resolve("userA", { eligible: false });

    expect(userId).toBe("userA");
    expect(outcome).toBe("new");
    expect(await redis.exists(`${SEEN_PREFIX}userA`)).toBe(1);
    expect(await redis.zrange(CAND_KEY, 0, -1)).toEqual([]);
  });

  it("keeps a known fingerprint unchanged", async () => {
    await resolve("userA");
    const [userId, outcome] = await resolve("userA", { nowMs: 1_010_000 });

    expect(userId).toBe("userA");
    expect(outcome).toBe("known");
  });

  it("attaches a new datacenter fingerprint when exactly one candidate is active", async () => {
    await resolve("userA");
    const [userId, outcome] = await resolve("rotatedB", { nowMs: 1_010_000 });

    expect(userId).toBe("userA");
    expect(outcome).toBe("attach");
    expect(await redis.get(`${ALIAS_PREFIX}rotatedB`)).toBe("userA");
    // The rotated fingerprint never becomes an identity of its own.
    expect(await redis.exists(`${SEEN_PREFIX}rotatedB`)).toBe(0);
    expect(await redis.zrange(CAND_KEY, 0, -1)).toEqual(["userA"]);
  });

  it("never attaches a datacenter arrival to a residential-only visitor", async () => {
    // The P1 review case: an unrelated home-ISP visitor with the same common UA
    // browsed minutes earlier. They must not be merge bait.
    await resolve("residentialA", { eligible: false });
    const [userId, outcome] = await resolve("rotatedB", { nowMs: 1_010_000 });

    expect(userId).toBe("rotatedB");
    expect(outcome).toBe("abstain_none");
    expect(await redis.get(`${ALIAS_PREFIX}rotatedB`)).toBeNull();
  });

  it("follows the alias on subsequent events from the rotated fingerprint", async () => {
    await resolve("userA");
    await resolve("rotatedB", { nowMs: 1_010_000 });
    const [userId, outcome] = await resolve("rotatedB", { nowMs: 1_020_000 });

    expect(userId).toBe("userA");
    expect(outcome).toBe("alias");
  });

  it("abstains with several candidates (fleet UA behind one proxy)", async () => {
    await redis.zadd(CAND_KEY, 1_000_000, "userA");
    await redis.zadd(CAND_KEY, 1_001_000, "userB");

    const [userId, outcome] = await resolve("rotatedC", { nowMs: 1_010_000 });

    expect(userId).toBe("rotatedC");
    expect(outcome).toBe("abstain_multi");
    expect(await redis.get(`${ALIAS_PREFIX}rotatedC`)).toBeNull();
  });

  it("never attaches for residential egress even with one candidate present", async () => {
    await resolve("userA");
    const [userId, outcome] = await resolve("freshB", { nowMs: 1_010_000, eligible: false });

    expect(userId).toBe("freshB");
    expect(outcome).toBe("new");
  });

  it("ignores candidates outside the window", async () => {
    await resolve("userA");
    const [userId, outcome] = await resolve("rotatedB", { nowMs: 1_000_000 + WINDOW_MS + 1 });

    expect(userId).toBe("rotatedB");
    expect(outcome).toBe("abstain_none");
  });

  it("does not attach across user agents", async () => {
    await resolve("userA");
    const [userId, outcome] = await resolve("rotatedB", { nowMs: 1_010_000, uaKey: "sticky:cand:1::ua2" });

    expect(userId).toBe("rotatedB");
    expect(outcome).toBe("abstain_none");
  });

  it("resolves alias chains to the terminal id and compresses the path", async () => {
    // X -> A -> B -> C: A and B were each re-attached after their seen flags
    // lapsed. X's events must land on C, and X's alias must be rewritten to C
    // so the chain doesn't have to be walked again.
    await redis.set(`${ALIAS_PREFIX}userX`, "userA");
    await redis.set(`${ALIAS_PREFIX}userA`, "userB");
    await redis.set(`${ALIAS_PREFIX}userB`, "userC");

    const [userId, outcome] = await resolve("userX", { nowMs: 1_020_000 });

    expect(userId).toBe("userC");
    expect(outcome).toBe("alias");
    expect(await redis.get(`${ALIAS_PREFIX}userX`)).toBe("userC");
  });

  it("caps the candidate set without ever enabling a wrong single-candidate match", async () => {
    for (let i = 0; i < 40; i++) {
      await redis.zadd(CAND_KEY, 1_000_000 + i, `user${i}`);
    }

    const [, outcome] = await resolve("rotatedZ", { nowMs: 1_010_000 });
    expect(outcome).toBe("abstain_multi");

    const members = await redis.zrange(CAND_KEY, 0, -1);
    expect(members.length).toBeLessThanOrEqual(MAX_CANDIDATES);
  });
});
