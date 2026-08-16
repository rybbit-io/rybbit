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
  siteId: 123,
  ipAddress: "203.0.113.10",
  userAgent: "Mozilla/5.0 Chrome/120 Safari/537.36",
  hostname: "example.com",
  pathname: "/",
  eventType: "pageview",
  hasClientBotScore: true,
  nowMs: 1_000_000,
};

/** Rolling counters report their cardinality as `total`; `top`/`distinct` stay 0. */
const rollingReadings = (...totals: number[]) => totals.map(total => ({ total, top: 0, distinct: 0 }));

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

  it("does not flag rapid interaction-event bursts from a real widget user", async () => {
    // The Verge /order/ configurator case: an engaged human fires dozens of
    // auto-captured button_clicks in seconds. Must stay below conviction.
    let result = await observeTrackingAnomaly({ ...baseInput, eventType: "button_click" });
    for (let i = 1; i < 90; i++) {
      result = await observeTrackingAnomaly({
        ...baseInput,
        eventType: "button_click",
        nowMs: baseInput.nowMs + i * 100,
      });
    }

    expect(result.isAnomalous).toBe(false);
    expect(result.counters.tupleEvents10s).toBe(0);
  });

  it("flags beyond-human interaction bursts", async () => {
    let result = await observeTrackingAnomaly({ ...baseInput, eventType: "button_click" });
    for (let i = 1; i <= 101; i++) {
      result = await observeTrackingAnomaly({
        ...baseInput,
        eventType: "button_click",
        nowMs: baseInput.nowMs + i,
      });
    }

    expect(result.isAnomalous).toBe(true);
    expect(result.reasons.map(reason => reason.rule)).toContain("tuple_interaction_events_10s");
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

describe("cohort version uniformity (in-process fallback)", () => {
  beforeEach(() => {
    resetAnomalyScorerForTests();
    setRedisAnomalyEnabledForTests(false);
  });

  const cohortInput = {
    ...baseInput,
    screenWidth: 1280,
    screenHeight: 1200,
    language: "en-US",
  };

  const desktopChrome = (version: number) =>
    `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Safari/537.36`;

  /**
   * Feed one cohort a run of events. Each identity is distinct (a fresh IP), and
   * events are spaced minutes apart, so no per-identity rate rule can fire — the
   * cohort rule is the only thing left that could convict.
   */
  async function driveCohort(versions: number[]) {
    let result = await observeTrackingAnomaly({ ...cohortInput, userAgent: desktopChrome(versions[0]) });
    for (const [index, version] of versions.entries()) {
      result = await observeTrackingAnomaly({
        ...cohortInput,
        ipAddress: `198.51.100.${index % 254}`,
        userAgent: desktopChrome(version),
        pathname: `/summoners/${index}`,
        nowMs: baseInput.nowMs + index,
      });
    }
    return result;
  }

  it("convicts a busy cohort spread evenly across many browser versions", async () => {
    // 16 rotated versions in equal shares — the scraper fleet's shape.
    const versions = Array.from({ length: 480 }, (_, index) => 103 + (index % 16));

    const result = await driveCohort(versions);

    expect(result.isAnomalous).toBe(true);
    expect(result.reasons.map(reason => reason.rule)).toContain("cohort_version_uniformity_60s");
    expect(result.counters.cohortDistinctVersions60s).toBe(16);
  });

  it("leaves an equally busy organic cohort alone (one dominant current version)", async () => {
    // Same volume, but 87% on the current version and a long stale tail — the
    // measured shape of a real high-traffic population.
    const versions = Array.from({ length: 480 }, (_, index) => (index % 100 < 87 ? 150 : 140 + (index % 10)));

    const result = await driveCohort(versions);

    expect(result.isAnomalous).toBe(false);
    expect(result.reasons.map(reason => reason.rule)).not.toContain("cohort_version_uniformity_60s");
  });

  it("ignores a flat cohort that is too small to be a fleet", async () => {
    const versions = Array.from({ length: 100 }, (_, index) => 103 + (index % 16));

    const result = await driveCohort(versions);

    expect(result.isAnomalous).toBe(false);
    expect(result.counters.cohortEvents60s).toBeLessThan(300);
  });

  it("skips the cohort counter when the fingerprint is incomplete", async () => {
    const result = await observeTrackingAnomaly({ ...baseInput, screenWidth: undefined });

    expect(result.counters.cohortEvents60s).toBe(0);
    expect(result.counters.cohortDistinctVersions60s).toBe(0);
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
    mocks.anomalyObserve.mockResolvedValue(rollingReadings(31, 5, 2, 9, 3, 1, 4, 7));

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
    mocks.anomalyObserve.mockResolvedValue(rollingReadings(1, 1, 1, 1, 1));

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

  it("never convicts on crowd rules alone (CGNAT / busy-site protection)", async () => {
    // ip_events_60s (3) + ip_distinct_user_agents_5m (3) + ip_distinct_hosts_60s (2)
    // + site_user_agent_events_60s (1) = 9, but zero individual evidence: a busy
    // carrier-NAT IP on a popular site looks exactly like this.
    // Enabled specs for pageview input: te10, te60, tdp, ie60, idua, idh, sue.
    mocks.anomalyObserve.mockResolvedValue(rollingReadings(1, 2, 1, 500, 40, 12, 5000));

    const result = await observeTrackingAnomaly(baseInput);

    expect(result.isAnomalous).toBe(false);
    expect(result.score).toBe(0);
    expect(result.reasons.map(reason => reason.rule)).toEqual([
      "ip_events_60s",
      "ip_distinct_user_agents_5m",
      "ip_distinct_hosts_60s",
      "site_user_agent_events_60s",
    ]);
  });

  it("counts crowd rules once individual evidence exists", async () => {
    // tuple_events_10s fires (31 > 30) → crowd corroboration counts too.
    mocks.anomalyObserve.mockResolvedValue(rollingReadings(31, 31, 1, 500, 40, 12, 5000));

    const result = await observeTrackingAnomaly(baseInput);

    expect(result.isAnomalous).toBe(true);
    expect(result.score).toBe(4 + 3 + 3 + 2 + 1);
  });

  it("falls back to in-process counting when Redis fails, without throwing", async () => {
    mocks.anomalyObserve.mockRejectedValue(new Error("redis down"));

    const first = await observeTrackingAnomaly(baseInput);
    expect(first.counters.tupleEvents10s).toBe(1);

    const second = await observeTrackingAnomaly({ ...baseInput, nowMs: baseInput.nowMs + 1 });
    expect(second.counters.tupleEvents10s).toBe(2);
  });
});
