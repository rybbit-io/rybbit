import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiRateLimitConsume = vi.fn();

vi.mock("../db/redis/redis.js", () => ({ apiRateLimitConsume }));
vi.mock("./const.js", async importOriginal => ({
  ...(await importOriginal<typeof import("./const.js")>()),
  IS_CLOUD: true,
}));
vi.mock("./logger/logger.js", () => ({
  createServiceLogger: () => ({ warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

const { consumeApiRateLimit, dailyLimitForPlan } = await import("./apiRateLimit.js");
const { API_BURST_LIMIT, PRO_API_DAILY_LIMIT, STANDARD_API_DAILY_LIMIT } = await import("./const.js");

const redisResult = (overrides: Record<string, unknown> = {}) => ({
  allowed: true,
  scope: 0,
  burstRemaining: 49,
  dailyRemaining: 4999,
  retryAfterMs: 0,
  ...overrides,
});

describe("dailyLimitForPlan", () => {
  it("gives Pro and custom plans the higher quota", () => {
    expect(dailyLimitForPlan("pro")).toBe(PRO_API_DAILY_LIMIT);
    expect(dailyLimitForPlan("pro-annual")).toBe(PRO_API_DAILY_LIMIT);
    expect(dailyLimitForPlan("custom")).toBe(PRO_API_DAILY_LIMIT);
  });

  it("gives every other plan the standard quota", () => {
    expect(dailyLimitForPlan("standard")).toBe(STANDARD_API_DAILY_LIMIT);
    expect(dailyLimitForPlan("free")).toBe(STANDARD_API_DAILY_LIMIT);
    expect(dailyLimitForPlan(null)).toBe(STANDARD_API_DAILY_LIMIT);
    expect(dailyLimitForPlan(undefined)).toBe(STANDARD_API_DAILY_LIMIT);
  });
});

describe("consumeApiRateLimit", () => {
  beforeEach(() => {
    apiRateLimitConsume.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-05-01T23:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keys the budget on the owner and the current UTC day", async () => {
    apiRateLimitConsume.mockResolvedValue(redisResult());

    await consumeApiRateLimit("org1", 5000);

    expect(apiRateLimitConsume).toHaveBeenCalledWith(
      expect.objectContaining({ burstKey: "rl:burst:org1", dailyKey: `rl:day:org1:${Math.floor(Date.UTC(2024, 4, 1, 23) / 86_400_000)}` })
    );
  });

  it("reports a daily denial as retriable at the next UTC midnight", async () => {
    apiRateLimitConsume.mockResolvedValue(redisResult({ allowed: false, scope: 2, dailyRemaining: 0 }));

    const decision = await consumeApiRateLimit("org1", 5000);

    expect(decision.allowed).toBe(false);
    expect(decision.scope).toBe("daily");
    expect(decision.retryAfterSeconds).toBe(3600);
    expect(decision.dailyResetSeconds).toBe(3600);
  });

  it("rounds a sub-second burst denial up to one second", async () => {
    apiRateLimitConsume.mockResolvedValue(
      redisResult({ allowed: false, scope: 1, burstRemaining: 0, retryAfterMs: 200 })
    );

    const decision = await consumeApiRateLimit("org1", 5000);

    // Retry-After is in whole seconds; rounding down to 0 would invite an
    // immediate retry that is guaranteed to fail again.
    expect(decision.scope).toBe("burst");
    expect(decision.retryAfterSeconds).toBe(1);
  });

  it("falls back to in-process counters when Redis is unreachable", async () => {
    apiRateLimitConsume.mockRejectedValue(new Error("redis down"));

    const first = await consumeApiRateLimit("fallback-owner", 5000);
    expect(first.allowed).toBe(true);
    expect(first.burstRemaining).toBe(API_BURST_LIMIT - 1);

    for (let i = 1; i < API_BURST_LIMIT; i++) {
      await consumeApiRateLimit("fallback-owner", 5000);
    }

    // The burst ceiling still holds per instance — the tier that protects the
    // database survives a Redis outage even though the accounting is degraded.
    const denied = await consumeApiRateLimit("fallback-owner", 5000);
    expect(denied.allowed).toBe(false);
    expect(denied.scope).toBe("burst");
  });

  it("enforces the daily quota in the fallback too", async () => {
    apiRateLimitConsume.mockRejectedValue(new Error("redis down"));

    for (let i = 0; i < 3; i++) {
      await consumeApiRateLimit("fallback-quota", 3);
    }

    const denied = await consumeApiRateLimit("fallback-quota", 3);
    expect(denied.allowed).toBe(false);
    expect(denied.scope).toBe("daily");
    expect(denied.dailyRemaining).toBe(0);
  });

  it("treats a zero daily limit as unlimited in the fallback", async () => {
    apiRateLimitConsume.mockRejectedValue(new Error("redis down"));

    const decision = await consumeApiRateLimit("fallback-selfhosted", 0);

    expect(decision.allowed).toBe(true);
    expect(decision.dailyLimit).toBe(0);
  });

  // Declaration order matters: this trips the shared breaker, so it runs last.
  it("stops calling Redis after a run of failures", async () => {
    apiRateLimitConsume.mockRejectedValue(new Error("redis down"));

    for (let i = 0; i < 5; i++) {
      await consumeApiRateLimit("breaker-owner", 5000);
    }
    const callsDuringOutage = apiRateLimitConsume.mock.calls.length;
    await consumeApiRateLimit("breaker-owner", 5000);

    // Every request would otherwise pay the full Redis command timeout, adding
    // a second of latency to the entire API for the length of an outage.
    expect(apiRateLimitConsume.mock.calls.length).toBe(callsDuringOutage);
  });
});
