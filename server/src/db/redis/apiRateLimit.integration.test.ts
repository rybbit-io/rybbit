import RedisMock from "ioredis-mock";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_RATE_LIMIT_LUA } from "./apiRateLimitLua.js";

// Behavioral tests for the rate limiter Lua, executed for real by ioredis-mock's
// embedded Lua runtime. The interaction between the two tiers — which one denies
// first, and which one gets charged when the other denies — only exists inside
// the script, so TS-level mocks cannot cover it.

const BURST_CAPACITY = 50;
const BURST_REFILL_PER_SECOND = 5;
const DAILY_LIMIT = 100;
const DAILY_TTL = 90_000;

const BURST_KEY = "rl:burst:org1";
const DAILY_KEY = "rl:day:org1:20000";

interface LimiterMockRedis {
  apiRateLimit(...args: (string | number)[]): Promise<[number, number, number, number, number]>;
  get(key: string): Promise<string | null>;
  ttl(key: string): Promise<number>;
  flushall(): Promise<unknown>;
}

let redis: LimiterMockRedis;

function consume(opts: { dailyLimit?: number; observe?: boolean } = {}) {
  return redis.apiRateLimit(
    BURST_KEY,
    DAILY_KEY,
    BURST_CAPACITY,
    BURST_REFILL_PER_SECOND,
    opts.dailyLimit ?? DAILY_LIMIT,
    DAILY_TTL,
    opts.observe ? 1 : 0
  );
}

async function consumeTimes(count: number, opts: { dailyLimit?: number; observe?: boolean } = {}) {
  let last: [number, number, number, number, number] | undefined;
  for (let i = 0; i < count; i++) {
    last = await consume(opts);
  }
  return last!;
}

describe("apiRateLimit Lua script", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-05-01T12:00:00Z"));
    const client = new RedisMock();
    client.defineCommand("apiRateLimit", { numberOfKeys: 2, lua: API_RATE_LIMIT_LUA });
    redis = client as unknown as LimiterMockRedis;
    await redis.flushall();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("admits a full bucket in one spike and reports the remaining tokens", async () => {
    const [allowed, scope, burstRemaining, dailyRemaining] = await consume();

    expect(allowed).toBe(1);
    expect(scope).toBe(0);
    expect(burstRemaining).toBe(BURST_CAPACITY - 1);
    expect(dailyRemaining).toBe(DAILY_LIMIT - 1);

    const [lastAllowed, lastScope, lastRemaining] = await consumeTimes(BURST_CAPACITY - 1);
    expect(lastAllowed).toBe(1);
    expect(lastScope).toBe(0);
    expect(lastRemaining).toBe(0);
  });

  it("denies on the burst tier once the bucket is drained", async () => {
    await consumeTimes(BURST_CAPACITY);

    const [allowed, scope, burstRemaining, , retryAfterMs] = await consume();

    expect(allowed).toBe(0);
    expect(scope).toBe(1);
    expect(burstRemaining).toBe(0);
    expect(retryAfterMs).toBeGreaterThan(0);
    expect(retryAfterMs).toBeLessThanOrEqual(1000 / BURST_REFILL_PER_SECOND);
  });

  it("refills the bucket continuously rather than at a window boundary", async () => {
    await consumeTimes(BURST_CAPACITY);
    expect((await consume())[0]).toBe(0);

    // One second at 5 tokens/s buys 5 requests, not a whole new window.
    vi.advanceTimersByTime(1000);

    const admitted = [];
    for (let i = 0; i < 6; i++) {
      admitted.push((await consume())[0]);
    }
    expect(admitted).toEqual([1, 1, 1, 1, 1, 0]);
  });

  it("restores at most a full bucket no matter how long it sits idle", async () => {
    await consumeTimes(BURST_CAPACITY);
    vi.advanceTimersByTime(60 * 60 * 1000);

    const [, , burstRemaining] = await consume();
    expect(burstRemaining).toBe(BURST_CAPACITY - 1);
  });

  it("denies on the daily tier without charging the burst bucket", async () => {
    // Drain the quota, refilling the burst bucket between spikes.
    for (let batch = 0; batch < 2; batch++) {
      await consumeTimes(BURST_CAPACITY);
      vi.advanceTimersByTime(BURST_CAPACITY / BURST_REFILL_PER_SECOND * 1000);
    }

    const [allowed, scope, burstRemaining, dailyRemaining] = await consume();

    expect(allowed).toBe(0);
    expect(scope).toBe(2);
    expect(dailyRemaining).toBe(0);
    // The refused request must not cost a burst token: an exhausted quota would
    // otherwise keep draining a budget the caller can no longer spend.
    expect(burstRemaining).toBe(BURST_CAPACITY);
    expect(await redis.get(DAILY_KEY)).toBe(String(DAILY_LIMIT));
  });

  it("reports the daily tier ahead of the burst tier when both are exhausted", async () => {
    // Two full spikes with one refill between them lands on the quota and the
    // empty bucket at the same instant.
    await consumeTimes(BURST_CAPACITY);
    vi.advanceTimersByTime((BURST_CAPACITY / BURST_REFILL_PER_SECOND) * 1000);
    await consumeTimes(BURST_CAPACITY);

    const [allowed, scope, burstRemaining] = await consume();

    expect(allowed).toBe(0);
    expect(burstRemaining).toBe(0);
    // Both tiers would deny, but daily is the one worth reporting: it is the
    // limit the caller has to wait hours rather than milliseconds for.
    expect(scope).toBe(2);
  });

  it("does not charge the quota for a request the burst tier refused", async () => {
    await consumeTimes(BURST_CAPACITY);
    await consumeTimes(10);

    // Only the admitted requests count toward the daily quota — a client stuck
    // in a retry loop must not burn its whole day against a closed burst gate.
    expect(await redis.get(DAILY_KEY)).toBe(String(BURST_CAPACITY));
  });

  it("expires the daily counter so the quota resets by key rollover", async () => {
    await consume();
    expect(await redis.ttl(DAILY_KEY)).toBeGreaterThan(0);
    expect(await redis.ttl(DAILY_KEY)).toBeLessThanOrEqual(DAILY_TTL);
  });

  it("treats a daily limit of 0 as unlimited", async () => {
    const [allowed, scope, , dailyRemaining] = await consume({ dailyLimit: 0 });

    expect(allowed).toBe(1);
    expect(scope).toBe(0);
    expect(dailyRemaining).toBe(-1);
    expect(await redis.get(DAILY_KEY)).toBeNull();
  });

  it("counts but never denies in observe mode", async () => {
    await consumeTimes(BURST_CAPACITY, { observe: true });

    const [allowed, scope] = await consume({ observe: true });

    // The caller still learns it would have been denied, and the daily total
    // keeps climbing so a shadow run measures real traffic.
    expect(allowed).toBe(0);
    expect(scope).toBe(1);
    expect(await redis.get(DAILY_KEY)).toBe(String(BURST_CAPACITY + 1));
  });
});
