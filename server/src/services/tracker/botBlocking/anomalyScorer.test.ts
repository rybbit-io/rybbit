import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  anomalyObserve: vi.fn(),
}));

vi.mock("../../../db/redis/redis.js", () => ({
  redis: {},
  anomalyObserve: (...args: unknown[]) => mocks.anomalyObserve(...args),
}));

import {
  observeTrackingAnomaly,
  resetAnomalyScorerForTests,
  setRedisAnomalyEnabledForTests,
} from "./anomalyScorer.js";

const baseInput = {
  siteId: "site_123",
  ipAddress: "203.0.113.10",
  userAgent: "Mozilla/5.0 Chrome/120 Safari/537.36",
  hostname: "example.com",
  pathname: "/",
  eventType: "pageview",
  hasClientBotScore: true,
  nowMs: 1_000_000,
};

describe("observeTrackingAnomaly (in-process fallback)", () => {
  beforeEach(() => {
    resetAnomalyScorerForTests();
    setRedisAnomalyEnabledForTests(false);
  });

  it("does not flag normal traffic", async () => {
    const result = await observeTrackingAnomaly(baseInput);

    expect(result.isAnomalous).toBe(false);
    expect(result.score).toBe(0);
    expect(result.reasons).toEqual([]);
  });

  it("flags high request bursts for a single visitor tuple", async () => {
    let result = await observeTrackingAnomaly(baseInput);
    for (let i = 1; i < 30; i++) {
      result = await observeTrackingAnomaly({ ...baseInput, nowMs: baseInput.nowMs + i });
    }

    expect(result.isAnomalous).toBe(false);

    result = await observeTrackingAnomaly({ ...baseInput, nowMs: baseInput.nowMs + 30 });
    expect(result.isAnomalous).toBe(true);
    expect(result.reasons.map(reason => reason.rule)).toContain("tuple_events_10s");
  });

  it("flags fast path crawling", async () => {
    let result = await observeTrackingAnomaly(baseInput);
    for (let i = 1; i <= 25; i++) {
      result = await observeTrackingAnomaly({
        ...baseInput,
        pathname: `/docs/${i}`,
        nowMs: baseInput.nowMs + i,
      });
    }

    expect(result.isAnomalous).toBe(true);
    expect(result.reasons.map(reason => reason.rule)).toContain("tuple_distinct_paths_60s");
  });

  it("treats missing client score as weak context, not enough to block by itself", async () => {
    let result = await observeTrackingAnomaly({ ...baseInput, hasClientBotScore: false });
    for (let i = 1; i <= 20; i++) {
      result = await observeTrackingAnomaly({
        ...baseInput,
        hasClientBotScore: false,
        nowMs: baseInput.nowMs + i * 2_000,
      });
    }

    expect(result.isAnomalous).toBe(false);
    expect(result.reasons).toEqual([
      {
        rule: "missing_client_score_60s",
        score: 1,
        value: 21,
        threshold: 20,
        windowSeconds: 60,
      },
    ]);
  });

  it("expires old observations outside the window", async () => {
    for (let i = 0; i < 35; i++) {
      await observeTrackingAnomaly({ ...baseInput, nowMs: baseInput.nowMs + i });
    }

    const result = await observeTrackingAnomaly({ ...baseInput, nowMs: baseInput.nowMs + 70_000 });
    expect(result.isAnomalous).toBe(false);
    expect(result.counters.tupleEvents10s).toBe(1);
  });
});

describe("observeTrackingAnomaly (Redis-backed)", () => {
  beforeEach(() => {
    resetAnomalyScorerForTests();
    setRedisAnomalyEnabledForTests(true);
    mocks.anomalyObserve.mockReset();
  });

  it("sends one spec per enabled counter and maps results back by counter name", async () => {
    // 8 counters, all enabled (path + host present, no client score).
    mocks.anomalyObserve.mockResolvedValue([31, 5, 2, 9, 3, 1, 4, 7]);

    const result = await observeTrackingAnomaly({ ...baseInput, hasClientBotScore: false });

    expect(mocks.anomalyObserve).toHaveBeenCalledTimes(1);
    const [nowMs, specs] = mocks.anomalyObserve.mock.calls[0];
    expect(nowMs).toBe(baseInput.nowMs);
    expect(specs).toHaveLength(8);
    expect(specs.map((spec: { key: string }) => spec.key)).toEqual([
      expect.stringContaining("bot:a:te10:"),
      expect.stringContaining("bot:a:te60:"),
      expect.stringContaining("bot:a:tdp:"),
      expect.stringContaining("bot:a:ie60:"),
      expect.stringContaining("bot:a:idua:"),
      expect.stringContaining("bot:a:idh:"),
      expect.stringContaining("bot:a:sue:"),
      expect.stringContaining("bot:a:mcs:"),
    ]);

    expect(result.counters.tupleEvents10s).toBe(31);
    expect(result.counters.missingClientScore60s).toBe(7);
    expect(result.isAnomalous).toBe(true);
    expect(result.reasons.map(reason => reason.rule)).toContain("tuple_events_10s");
  });

  it("omits conditional counters that don't apply and reports them as zero", async () => {
    // No pathname, no hostname, client score present → 3 counters dropped.
    mocks.anomalyObserve.mockResolvedValue([1, 1, 1, 1, 1]);

    const result = await observeTrackingAnomaly({
      ...baseInput,
      pathname: undefined,
      hostname: undefined,
      hasClientBotScore: true,
    });

    const [, specs] = mocks.anomalyObserve.mock.calls[0];
    expect(specs).toHaveLength(5);
    expect(result.counters.tupleDistinctPaths60s).toBe(0);
    expect(result.counters.ipDistinctHosts60s).toBe(0);
    expect(result.counters.missingClientScore60s).toBe(0);
  });

  it("falls back to in-process counting when Redis fails, without throwing", async () => {
    mocks.anomalyObserve.mockRejectedValue(new Error("redis down"));

    const first = await observeTrackingAnomaly(baseInput);
    expect(first.counters.tupleEvents10s).toBe(1);

    const second = await observeTrackingAnomaly({ ...baseInput, nowMs: baseInput.nowMs + 1 });
    expect(second.counters.tupleEvents10s).toBe(2);
  });
});
