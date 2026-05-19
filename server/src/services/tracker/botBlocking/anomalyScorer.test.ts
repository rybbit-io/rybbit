import { beforeEach, describe, expect, it } from "vitest";
import { observeTrackingAnomaly, resetAnomalyScorerForTests } from "./anomalyScorer.js";

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

describe("observeTrackingAnomaly", () => {
  beforeEach(() => {
    resetAnomalyScorerForTests();
  });

  it("does not flag normal traffic", () => {
    const result = observeTrackingAnomaly(baseInput);

    expect(result.isAnomalous).toBe(false);
    expect(result.score).toBe(0);
    expect(result.reasons).toEqual([]);
  });

  it("flags high request bursts for a single visitor tuple", () => {
    let result = observeTrackingAnomaly(baseInput);
    for (let i = 1; i < 30; i++) {
      result = observeTrackingAnomaly({ ...baseInput, nowMs: baseInput.nowMs + i });
    }

    expect(result.isAnomalous).toBe(false);

    result = observeTrackingAnomaly({ ...baseInput, nowMs: baseInput.nowMs + 30 });
    expect(result.isAnomalous).toBe(true);
    expect(result.reasons.map(reason => reason.rule)).toContain("tuple_events_10s");
  });

  it("flags fast path crawling", () => {
    let result = observeTrackingAnomaly(baseInput);
    for (let i = 1; i <= 25; i++) {
      result = observeTrackingAnomaly({
        ...baseInput,
        pathname: `/docs/${i}`,
        nowMs: baseInput.nowMs + i,
      });
    }

    expect(result.isAnomalous).toBe(true);
    expect(result.reasons.map(reason => reason.rule)).toContain("tuple_distinct_paths_60s");
  });

  it("treats missing client score as weak context, not enough to block by itself", () => {
    let result = observeTrackingAnomaly({ ...baseInput, hasClientBotScore: false });
    for (let i = 1; i <= 20; i++) {
      result = observeTrackingAnomaly({
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

  it("expires old observations outside the window", () => {
    for (let i = 0; i < 35; i++) {
      observeTrackingAnomaly({ ...baseInput, nowMs: baseInput.nowMs + i });
    }

    const result = observeTrackingAnomaly({ ...baseInput, nowMs: baseInput.nowMs + 70_000 });
    expect(result.isAnomalous).toBe(false);
    expect(result.counters.tupleEvents10s).toBe(1);
  });
});
