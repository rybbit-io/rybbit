import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  anomalyObserve: vi.fn(),
}));

vi.mock("../../../db/redis/redis.js", () => ({
  redis: {},
  anomalyObserve: (...args: unknown[]) => mocks.anomalyObserve(...args),
}));

import {
  BucketedCounter,
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

describe("BucketedCounter key bound", () => {
  // `cleanup` only frees an entry once its window has passed, and the actor
  // counter's window is a day — so without a key bound a Redis outage would
  // leave it holding an entry for every address seen all day.
  const WINDOW = 60_000;

  it("stops admitting new keys at the cap and reports them as zero", () => {
    const counter = new BucketedCounter();

    expect(counter.observe("a", 0, WINDOW, 2)).toBe(1);
    expect(counter.observe("b", 0, WINDOW, 2)).toBe(1);
    // At capacity: "c" is never held, so it counts as nothing rather than
    // displacing someone. Under-reporting is the safe direction — this evidence
    // can only ever raise a score, so a suppressed count cannot accuse anyone.
    expect(counter.observe("c", 0, WINDOW, 2)).toBe(0);
    expect(counter.observe("c", 0, WINDOW, 2)).toBe(0);
  });

  it("keeps counting the keys it already holds", () => {
    const counter = new BucketedCounter();

    counter.observe("a", 0, WINDOW, 1);
    counter.observe("b", 0, WINDOW, 1);

    expect(counter.observe("a", 0, WINDOW, 1)).toBe(2);
  });

  it("rolls an existing key into a new window even at capacity", () => {
    // A rollover replaces an entry rather than adding one, so refusing it would
    // freeze the counter at its first window's membership forever.
    const counter = new BucketedCounter();
    counter.observe("a", 0, WINDOW, 1);

    expect(counter.observe("a", WINDOW, WINDOW, 1)).toBe(1);
  });

  it("readmits keys once cleanup has freed the window", () => {
    const counter = new BucketedCounter();
    counter.observe("a", 0, WINDOW, 1);

    expect(counter.observe("b", 0, WINDOW, 1)).toBe(0);

    counter.cleanup(WINDOW * 3, WINDOW);

    expect(counter.observe("b", WINDOW * 3, WINDOW, 1)).toBe(1);
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
    expect(result.reasons.map(reason => reason.rule)).toContain("cohort_version_uniformity_1h");
    expect(result.counters.cohortDistinctVersions1h).toBe(16);
  });

  it("leaves an equally busy organic cohort alone (one dominant current version)", async () => {
    // Same volume, but 87% on the current version and a long stale tail — the
    // measured shape of a real high-traffic population.
    const versions = Array.from({ length: 480 }, (_, index) => (index % 100 < 87 ? 150 : 140 + (index % 10)));

    const result = await driveCohort(versions);

    expect(result.isAnomalous).toBe(false);
    expect(result.reasons.map(reason => reason.rule)).not.toContain("cohort_version_uniformity_1h");
  });

  it("ignores a flat cohort that is too small to be a fleet", async () => {
    const versions = Array.from({ length: 60 }, (_, index) => 103 + (index % 16));

    const result = await driveCohort(versions);

    expect(result.isAnomalous).toBe(false);
    expect(result.counters.cohortEvents1h).toBeLessThan(100);
  });

  it("skips the cohort counter when the fingerprint is incomplete", async () => {
    const result = await observeTrackingAnomaly({ ...baseInput, screenWidth: undefined });

    expect(result.counters.cohortEvents1h).toBe(0);
    expect(result.counters.cohortDistinctVersions1h).toBe(0);
  });

  it("skips the cohort counter when the language is unset", async () => {
    // An unset language would otherwise merge every locale on the Site into one
    // cohort, which is the same defect as merging every browser.
    const result = await observeTrackingAnomaly({ ...cohortInput, language: undefined });

    expect(result.counters.cohortEvents1h).toBe(0);
  });

  /**
   * The regression fixture for the cohort key. Four browser families share one
   * screen and language, each peaked on its own current version the way real
   * populations are. Pooled into a single distribution — which is what the key
   * did before it carried the family — that reads as sixteen versions at a ~21%
   * modal share: every condition of the rule, met by nothing but ordinary
   * traffic on a busy Site.
   *
   * Each family is given enough volume to clear the rule's floor on its own, so
   * this passes because the distributions are separated, not because any of them
   * is too small to count.
   */
  it("does not convict a mixed-browser population sharing one screen and language", async () => {
    const families = [
      (version: number) => desktopChrome(version),
      (version: number) =>
        `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${version}.0) Gecko/20100101 Firefox/${version}.0`,
      (version: number) =>
        `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${version}.0 Safari/605.1.15`,
      (version: number) =>
        `Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/${version}.0 Chrome/115.0.0.0 Mobile Safari/537.36`,
    ];
    const dominantVersions = [150, 130, 18, 23];

    let result;
    let index = 0;
    for (const [familyIndex, buildUserAgent] of families.entries()) {
      const dominant = dominantVersions[familyIndex];
      for (let event = 0; event < 320; event++) {
        // 85% on the family's current version, the rest on a stale tail.
        const version = event % 100 < 85 ? dominant : dominant - 1 - (event % 3);
        result = await observeTrackingAnomaly({
          ...cohortInput,
          ipAddress: `198.51.100.${index % 254}`,
          userAgent: buildUserAgent(version),
          pathname: `/article/${index}`,
          nowMs: baseInput.nowMs + index,
        });
        index++;
      }
    }

    expect(result?.reasons.map(reason => reason.rule)).not.toContain("cohort_version_uniformity_1h");
    expect(result?.isAnomalous).toBe(false);
    // The last family's cohort saw only its own traffic, not all 1,280 events.
    expect(result?.counters.cohortEvents1h).toBe(320);
  });

  /**
   * Which family a real user agent resolves to, pinned through the cohort
   * counter: two agents sharing a family accumulate into one counter, and two
   * that don't each keep their own. Chromium derivatives split on where their
   * token sits relative to `Chrome/`, and that split is deliberate — see
   * `getBrowserIdentity`.
   */
  describe("browser family resolution against real user agents", () => {
    const chrome120 =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    const edge120 = `${chrome120} Edg/120.0.2210.144`;
    const opera120 = `${chrome120} OPR/106.0.4998.70`;
    const samsung23 =
      "Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36";
    const chromeIos120 =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.101 Mobile/15E148 Safari/604.1";
    const firefoxIos121 =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/121.0 Mobile/15E148 Safari/605.1.15";
    const safari17 =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15";

    /**
     * Ten events per agent, in order; returns each agent's final cohort event
     * count. A count of ten means that agent had a cohort to itself; anything
     * higher means it landed in one an earlier agent had already filled.
     */
    async function cohortSizesPerAgent(userAgents: string[]) {
      const sizes: number[] = [];
      let index = 0;
      for (const userAgent of userAgents) {
        let result;
        for (let event = 0; event < 10; event++) {
          result = await observeTrackingAnomaly({
            ...cohortInput,
            ipAddress: `198.51.100.${index % 254}`,
            userAgent,
            pathname: `/article/${index}`,
            nowMs: baseInput.nowMs + index,
          });
          index++;
        }
        sizes.push(result!.counters.cohortEvents1h);
      }
      return sizes;
    }

    it("pools Chromium derivatives that report their Chromium version", async () => {
      // Edge and Opera put their own token after `Chrome/`, so the leftmost
      // match is the Chromium version they actually ship. Chrome 120, Edge 120
      // and Opera 106-on-Chromium-120 do belong on one distribution: they track
      // the same release train and peak together, so 10 / 20 / 30 is the count
      // of one shared cohort filling up.
      expect(await cohortSizesPerAgent([chrome120, edge120, opera120])).toEqual([10, 20, 30]);
    });

    it("keeps one version distribution for a pooled derivative", async () => {
      // The pooling has to hold in the distribution too, not just the key: three
      // agents, one Chromium version between them.
      await cohortSizesPerAgent([chrome120, edge120, opera120]);
      const result = await observeTrackingAnomaly({ ...cohortInput, userAgent: edge120 });

      expect(result.counters.cohortDistinctVersions1h).toBe(1);
    });

    it("separates families whose version numbers move independently", async () => {
      // Samsung Internet and the iOS browsers put their token first, so each
      // keeps its own distribution — correct, because their version numbers are
      // on their own release schedules and would never peak together. Every
      // agent seeing exactly its own ten is that separation.
      const sizes = await cohortSizesPerAgent([chrome120, samsung23, chromeIos120, firefoxIos121, safari17]);

      expect(sizes).toEqual([10, 10, 10, 10, 10]);
    });
  });
});

describe("enumeration observer (shadow mode)", () => {
  beforeEach(() => {
    resetAnomalyScorerForTests();
    setRedisAnomalyEnabledForTests(false);
  });

  const enumerationInput = {
    ...baseInput,
    screenWidth: 1920,
    screenHeight: 1080,
    language: "en-US",
    referrer: "",
  };

  /**
   * One 15-minute bucket of enumerating traffic: a fresh identity per hit, a
   * path nobody has requested before, no referrer. Every per-identity rule sees
   * a single quiet visitor, which is the whole reason this shape needs its own
   * measurement.
   */
  async function driveEnumerationBucket(bucketStartMs: number) {
    let result;
    for (let index = 0; index < 320; index++) {
      result = await observeTrackingAnomaly({
        ...enumerationInput,
        // A distinct address per hit — the crawler mints a fresh identity each
        // time, which is exactly why no per-identity rule can see it.
        ipAddress: `198.51.${Math.floor(index / 254)}.${index % 254}`,
        pathname: `/status/online/gender/f/hair/white/page/${bucketStartMs}-${index}`,
        nowMs: bucketStartMs + index,
      });
    }
    return result;
  }

  it("observes an enumerating cohort without scoring it", async () => {
    const result = await driveEnumerationBucket(1_000_000);

    expect(result?.enumeration).toMatchObject({ qualifies: true, sustained: false });
    // The observation exists and the verdict does not move. Shadow mode is the
    // entire point: this rule is collecting evidence, not deciding anything.
    expect(result?.score).toBe(0);
    expect(result?.isAnomalous).toBe(false);
    expect(result?.convictingReasons).toEqual([]);
  });

  it("marks the cohort once the shape holds across two consecutive buckets", async () => {
    await driveEnumerationBucket(1_000_000);
    const result = await driveEnumerationBucket(1_000_000 + 15 * 60 * 1000);

    expect(result?.enumeration).toMatchObject({ qualifies: true, sustained: true });
    // Still not a verdict.
    expect(result?.isAnomalous).toBe(false);
  });

  it("does not carry a streak across a gap in the buckets", async () => {
    await driveEnumerationBucket(1_000_000);
    const result = await driveEnumerationBucket(1_000_000 + 3 * 15 * 60 * 1000);

    expect(result?.enumeration).toMatchObject({ qualifies: true, sustained: false });
  });

  it("does not observe when the hit arrived with a referrer", async () => {
    // Only a direct hit increments the direct counter, so only a direct hit can
    // read a meaningful share of them.
    const result = await observeTrackingAnomaly({ ...enumerationInput, referrer: "https://news.example.com/" });

    expect(result.enumeration).toBeUndefined();
  });
});

describe("site flood (in-process fallback)", () => {
  beforeEach(() => {
    resetAnomalyScorerForTests();
    setRedisAnomalyEnabledForTests(false);
  });

  // A 10-minute bucket boundary, so a run of events stays inside one bucket.
  const bucketStart = 1_200_000;
  const quietSite = { events10m: 0, eligible: true };
  const desktopChrome = (version: number) =>
    `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Safari/537.36`;

  /**
   * The measured shape of the site-7650 flood: one screen size, one language,
   * a fresh IP and a user agent drawn from a short list per hit, no referrer,
   * one event per identity, at a rate hundreds of times the site's normal.
   */
  async function driveOneShotFleet(count: number, overrides: Partial<AnomalyInputForTest> = {}) {
    let result;
    for (let index = 0; index < count; index++) {
      result = await observeTrackingAnomaly({
        ...baseInput,
        siteBaseline: quietSite,
        ipAddress: `203.0.${Math.floor(index / 250)}.${index % 250}`,
        userAgent: desktopChrome(118 + (index % 4)),
        screenWidth: 1920,
        screenHeight: 1080,
        language: "en-US",
        pathname: `/showcase/${index % 70}`,
        referrer: undefined,
        nowMs: bucketStart + index * 1_000,
        ...overrides,
      });
    }
    return result!;
  }

  type AnomalyInputForTest = Parameters<typeof observeTrackingAnomaly>[0];

  it("convicts a one-shot fleet flooding a quiet site", async () => {
    const result = await driveOneShotFleet(120);

    expect(result.isAnomalous).toBe(true);
    expect(result.convictingReasons.map(reason => reason.rule)).toContain("site_flood_oneshot_cohort_10m");
    expect(result.counters.siteEvents10m).toBe(120);
    expect(result.counters.cohortDistinctActors10m).toBe(120);
  });

  it("stays quiet below the flood gate", async () => {
    const result = await driveOneShotFleet(90);

    expect(result.isAnomalous).toBe(false);
  });

  it("never fires for a site with no baseline", async () => {
    const result = await driveOneShotFleet(200, { siteBaseline: null });

    expect(result.isAnomalous).toBe(false);
  });

  it("never fires for a site too young to have a baseline", async () => {
    const result = await driveOneShotFleet(200, { siteBaseline: { events10m: 0, eligible: false } });

    expect(result.isAnomalous).toBe(false);
  });

  it("scales the gate with the site's own baseline", async () => {
    // A site that normally does 30 events per 10 minutes needs 600 to be in flood.
    const result = await driveOneShotFleet(300, { siteBaseline: { events10m: 30, eligible: true } });

    expect(result.isAnomalous).toBe(false);
  });

  it("leaves a launch-shaped surge alone", async () => {
    // Many devices, several events per visitor, arrivals carrying a referrer:
    // the mirror image of the fleet, at the same rate on the same quiet site.
    const screens = [
      [390, 844],
      [393, 852],
      [430, 932],
      [1920, 1080],
      [1536, 864],
      [1366, 768],
      [412, 915],
      [1440, 900],
    ];
    let result;
    for (let index = 0; index < 300; index++) {
      const visitor = Math.floor(index / 3);
      const [screenWidth, screenHeight] = screens[visitor % screens.length];
      result = await observeTrackingAnomaly({
        ...baseInput,
        siteBaseline: quietSite,
        ipAddress: `198.51.${Math.floor(visitor / 250)}.${visitor % 250}`,
        userAgent: desktopChrome(150),
        screenWidth,
        screenHeight,
        language: "en-US",
        pathname: `/launch/${index % 5}`,
        referrer: "https://news.ycombinator.com/",
        nowMs: bucketStart + index * 1_000,
      });
    }

    expect(result!.counters.siteEvents10m).toBe(300);
    expect(result!.isAnomalous).toBe(false);
  });

  it("leaves a one-shot campaign alone when devices are diverse", async () => {
    // Email/push campaign: one hit per recipient, no referrer — but real devices,
    // so no single cohort holds a quarter of the site's traffic.
    const screens = [
      [390, 844],
      [393, 852],
      [430, 932],
      [1920, 1080],
      [1536, 864],
      [1366, 768],
      [412, 915],
      [1440, 900],
    ];
    let result;
    for (let index = 0; index < 300; index++) {
      const [screenWidth, screenHeight] = screens[index % screens.length];
      result = await observeTrackingAnomaly({
        ...baseInput,
        siteBaseline: quietSite,
        ipAddress: `198.51.${Math.floor(index / 250)}.${index % 250}`,
        userAgent: desktopChrome(150),
        screenWidth,
        screenHeight,
        language: "en-US",
        pathname: "/promo",
        referrer: undefined,
        nowMs: bucketStart + index * 1_000,
      });
    }

    expect(result!.isAnomalous).toBe(false);
  });

  it("convicts a hosting address carrying a flood on its own", async () => {
    // The Azure archetype: one datacenter address, ~300 events a day, paced
    // under every short-window rule, on a site it has pushed into flood.
    let result;
    for (let index = 0; index < 250; index++) {
      result = await observeTrackingAnomaly({
        ...baseInput,
        siteBaseline: quietSite,
        ipAddress: "20.0.0.5",
        isHostingAsn: true,
        asn: 8075,
        screenWidth: 1920,
        screenHeight: 1080,
        language: "en-US",
        pathname: "/",
        nowMs: bucketStart + index * 2_000,
      });
    }

    expect(result!.isAnomalous).toBe(true);
    expect(result!.convictingReasons.map(reason => reason.rule)).toContain("site_flood_actor_1d");
  });

  it("never convicts a residential address on volume inside a flood", async () => {
    // A power user of a small internal tool: one home address, all day, a
    // few events a minute, and the site's entire "flood" against a near-zero
    // baseline. Two real people were blocked this way on the rule's first day.
    let result;
    for (let index = 0; index < 1200; index++) {
      result = await observeTrackingAnomaly({
        ...baseInput,
        siteBaseline: quietSite,
        ipAddress: "203.0.113.77",
        isHostingAsn: false,
        pathname: "/",
        nowMs: bucketStart + index * 2_000,
      });
    }

    expect(result!.reasons.map(reason => reason.rule)).not.toContain("site_flood_actor_1d");
    expect(result!.isAnomalous).toBe(false);
  });
});

describe("hosting actor volume (Redis-backed)", () => {
  beforeEach(() => {
    resetAnomalyScorerForTests();
    setRedisAnomalyEnabledForTests(true);
    mocks.anomalyObserve.mockReset();
  });

  // Spec order for baseInput: te10, te60, tdp, ie60, idua, idh, sue, av, se, sa.
  it("convicts a hosting address on long-window volume alone", async () => {
    mocks.anomalyObserve.mockResolvedValue(rollingReadings(1, 2, 1, 10, 1, 1, 5, 1500, 20, 20));

    const result = await observeTrackingAnomaly({ ...baseInput, isHostingAsn: true, asn: 8075 });

    expect(result.isAnomalous).toBe(true);
    expect(result.convictingReasons.map(reason => reason.rule)).toEqual(["hosting_actor_events_1d"]);
  });

  it("exempts SASE egress from the hosting rule", async () => {
    mocks.anomalyObserve.mockResolvedValue(rollingReadings(1, 2, 1, 10, 1, 1, 5, 1500, 20, 20));

    const result = await observeTrackingAnomaly({ ...baseInput, isHostingAsn: true, asn: 13150 });

    expect(result.isAnomalous).toBe(false);
    expect(result.reasons.map(reason => reason.rule)).not.toContain("hosting_actor_events_1d");
  });

  it("drops the hosting rule for an address showing many user agents", async () => {
    mocks.anomalyObserve.mockResolvedValue(rollingReadings(1, 2, 1, 10, 12, 1, 5, 1500, 20, 20));

    const result = await observeTrackingAnomaly({ ...baseInput, isHostingAsn: true, asn: 8075 });

    expect(result.isAnomalous).toBe(false);
  });
});

describe("observeTrackingAnomaly (Redis-backed)", () => {
  beforeEach(() => {
    resetAnomalyScorerForTests();
    setRedisAnomalyEnabledForTests(true);
    mocks.anomalyObserve.mockReset();
  });

  it("sends one spec per enabled counter and maps results back by counter name", async () => {
    // 11 counters (path + host present, no client score, plus the two site-flood
    // counters). The cohort and enumeration counters stay out: this input has
    // no screen dimensions.
    mocks.anomalyObserve.mockResolvedValue(rollingReadings(31, 5, 2, 9, 3, 1, 4, 7, 12, 1, 1));

    const result = await observeTrackingAnomaly({ ...baseInput, hasClientBotScore: false });

    expect(mocks.anomalyObserve).toHaveBeenCalledTimes(1);
    const [nowMs, specs] = mocks.anomalyObserve.mock.calls[0];
    expect(nowMs).toBe(baseInput.nowMs);
    expect(specs).toHaveLength(11);
    expect(specs.map((spec: { key: string }) => spec.key)).toEqual([
      expect.stringContaining("bot:a:te10:"),
      expect.stringContaining("bot:a:te60:"),
      expect.stringContaining("bot:a:tdp:"),
      expect.stringContaining("bot:a:ie60:"),
      expect.stringContaining("bot:a:idua:"),
      expect.stringContaining("bot:a:idh:"),
      expect.stringContaining("bot:a:sue:"),
      expect.stringContaining("bot:a:mcs:"),
      expect.stringContaining("bot:a:av:"),
      expect.stringContaining("bot:f:se:"),
      expect.stringContaining("bot:f:sa:"),
    ]);

    expect(result.counters.tupleEvents10s).toBe(31);
    expect(result.counters.missingClientScore60s).toBe(7);
    expect(result.isAnomalous).toBe(true);
    expect(result.reasons.map(reason => reason.rule)).toContain("tuple_events_10s");
  });

  // Spec order for baseInput (client score present, so no `mcs`):
  // te10, te60, tdp, ie60, idua, idh, sue, av, se, sa.
  it("never convicts on long-window volume alone", async () => {
    // 1,500 events in a day from one actor — five times the measured p99.99 —
    // and nothing else. A scraper looks like this; so does a single office
    // behind one SASE egress address, which is why this can only corroborate.
    mocks.anomalyObserve.mockResolvedValue(rollingReadings(1, 2, 1, 10, 1, 1, 5, 1500));

    const result = await observeTrackingAnomaly(baseInput);

    expect(result.isAnomalous).toBe(false);
    expect(result.score).toBe(0);
    expect(result.supportingReasons.map(reason => reason.rule)).toContain("actor_events_1d");
    expect(result.convictingReasons).toEqual([]);
  });

  it("drops long-window volume entirely for an actor showing many user agents", async () => {
    // The shared-egress signature: one address, many browsers. Corporate SASE
    // and VPN gateways sit here permanently, and their daily counts are large
    // and legitimate — the rule must not even record against them.
    mocks.anomalyObserve.mockResolvedValue(rollingReadings(1, 2, 1, 10, 12, 1, 5, 1500));

    const result = await observeTrackingAnomaly(baseInput);

    expect(result.reasons.map(reason => reason.rule)).not.toContain("actor_events_1d");
    expect(result.reasons.map(reason => reason.rule)).toContain("ip_distinct_user_agents_5m");
  });

  it("adds long-window volume to a score that convicting evidence already opened", async () => {
    // tuple_events_10s (4, convicting) + actor_events_1d (1, supporting).
    mocks.anomalyObserve.mockResolvedValue(rollingReadings(31, 2, 1, 10, 1, 1, 5, 1500));

    const result = await observeTrackingAnomaly(baseInput);

    expect(result.convictingReasons.map(reason => reason.rule)).toEqual(["tuple_events_10s"]);
    expect(result.score).toBe(5);
    expect(result.isAnomalous).toBe(true);
  });

  it("omits conditional counters that don't apply and reports them as zero", async () => {
    // No pathname, no hostname, client score present → 3 counters dropped.
    mocks.anomalyObserve.mockResolvedValue(rollingReadings(1, 1, 1, 1, 1, 1, 1, 1));

    const result = await observeTrackingAnomaly({
      ...baseInput,
      pathname: undefined,
      hostname: undefined,
      hasClientBotScore: true,
    });

    const [, specs] = mocks.anomalyObserve.mock.calls[0];
    expect(specs).toHaveLength(8);
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

describe("hosting range volume (shadow, in-process fallback)", () => {
  beforeEach(() => {
    resetAnomalyScorerForTests();
    setRedisAnomalyEnabledForTests(false);
  });

  const scraper = {
    ...baseInput,
    isHostingAsn: true,
    asn: 203020,
    screenWidth: 375 as number | undefined,
    screenHeight: 812 as number | undefined,
    capturesHumanInteractions: true,
  };

  /** One pageview every minute, each from the next address in one /24. */
  const crawl = async (count: number, overrides: Partial<typeof scraper> = {}) => {
    let result = await observeTrackingAnomaly({ ...scraper, ...overrides });
    for (let index = 0; index < count; index++) {
      result = await observeTrackingAnomaly({
        ...scraper,
        ...overrides,
        ipAddress: `198.51.100.${index % 250}`,
        pathname: `/players/${index}`,
        nowMs: baseInput.nowMs + index * 60_000,
      });
    }
    return result;
  };
  const shadowRules = (result: Awaited<ReturnType<typeof crawl>>) => result.shadowReasons.map(reason => reason.rule);

  it("records a scraper rotating addresses inside one hosting range, without convicting", async () => {
    const result = await crawl(1100);

    // No single address comes near the per-address threshold, which is the gap.
    expect(result.reasons.map(reason => reason.rule)).not.toContain("hosting_actor_events_1d");
    expect(shadowRules(result)).toEqual(["hosting_range_events_1d"]);
    expect(result.convictingReasons).toEqual([]);
    expect(result.isAnomalous).toBe(false);
  });

  it("stays quiet below the daily threshold", async () => {
    expect(shadowRules(await crawl(900))).toEqual([]);
  });

  it("never fires for a range outside hosting space", async () => {
    expect(shadowRules(await crawl(1100, { isHostingAsn: false }))).toEqual([]);
  });

  it("says nothing on a site that could not have recorded an interaction", async () => {
    // Button, copy and form tracking default off: zero clicks is not evidence.
    expect(shadowRules(await crawl(1100, { capturesHumanInteractions: false }))).toEqual([]);
  });

  it("stands down once the actor has interacted", async () => {
    for (const eventType of ["button_click", "outbound"]) {
      resetAnomalyScorerForTests();
      await crawl(600);
      await observeTrackingAnomaly({
        ...scraper,
        ipAddress: "198.51.100.7",
        eventType,
        nowMs: baseInput.nowMs + 600 * 60_000,
      });
      const result = await crawl(1100);

      expect(result.counters.hostingRangeInteractions1d, eventType).toBe(1);
      expect(shadowRules(result), eventType).toEqual([]);
    }
  });

  it("does not count a custom event as a human interaction", async () => {
    await observeTrackingAnomaly({ ...scraper, ipAddress: "198.51.100.7", eventType: "custom_event" });
    const result = await crawl(1100);

    expect(result.counters.hostingRangeInteractions1d).toBe(0);
    expect(shadowRules(result)).toEqual(["hosting_range_events_1d"]);
  });

  it("stands down for a range showing many screens, which is a crowd", async () => {
    for (const [screenWidth, screenHeight] of [
      [390, 844],
      [393, 852],
      [430, 932],
    ]) {
      await observeTrackingAnomaly({ ...scraper, ipAddress: "198.51.100.7", screenWidth, screenHeight });
    }
    const result = await crawl(1100);

    expect(result.counters.hostingRangeScreens1d).toBeGreaterThan(2);
    expect(shadowRules(result)).toEqual([]);
  });

  it("does not count a hit with no screen size as a display, and needs one that is known", async () => {
    const blind = await crawl(1100, { screenWidth: undefined, screenHeight: undefined });

    expect(blind.counters.hostingRangeScreens1d).toBe(0);
    expect(shadowRules(blind)).toEqual([]);

    // The same range, once a real display shows up, is judged on that display.
    const seen = await crawl(10);
    expect(seen.counters.hostingRangeScreens1d).toBe(1);
    expect(shadowRules(seen)).toEqual(["hosting_range_events_1d"]);
  });

  it("neither judges nor counts relay and SASE networks", async () => {
    for (const asn of [13335, 36183, 20940, 54113, 13150]) {
      resetAnomalyScorerForTests();
      const result = await crawl(1100, { asn });

      expect(result.counters.hostingRangeEvents1d, String(asn)).toBe(0);
      expect(shadowRules(result), String(asn)).toEqual([]);
    }
  });

  it("keeps two browsers in one range apart", async () => {
    await crawl(600);
    const result = await crawl(600, {
      userAgent: "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
    });

    expect(result.counters.hostingRangeEvents1d).toBe(600);
    expect(shadowRules(result)).toEqual([]);
  });
});

describe("hosting range volume after a Redis outage", () => {
  beforeEach(() => {
    resetAnomalyScorerForTests();
    setRedisAnomalyEnabledForTests(true);
    mocks.anomalyObserve.mockReset();
  });

  const hit = {
    ...baseInput,
    isHostingAsn: true,
    asn: 203020,
    screenWidth: 375,
    screenHeight: 812,
    capturesHumanInteractions: true,
  };
  type Spec = { key: string; readOnly?: boolean };
  /** A range over the threshold with no interactions and one screen. */
  const overThreshold = (gap: number) => (_nowMs: number, specs: Spec[]) =>
    Promise.resolve(
      specs.map(spec => {
        const total = spec.key.startsWith("bot:a:hre:")
          ? 5000
          : spec.key.startsWith("bot:a:hrs:")
            ? 1
            : spec.key.startsWith("bot:a:gap:")
              ? gap
              : 0;
        return { total, top: 0, distinct: 0 };
      })
    );
  const gapSpec = () => {
    const calls = mocks.anomalyObserve.mock.calls;
    const specs = calls[calls.length - 1][1] as Spec[];
    return specs.find(spec => spec.key.startsWith("bot:a:gap:"));
  };

  it("records the range while the day's counters are whole", async () => {
    mocks.anomalyObserve.mockImplementation(overThreshold(0));
    const result = await observeTrackingAnomaly(hit);

    expect(result.shadowReasons.map(reason => reason.rule)).toEqual(["hosting_range_events_1d"]);
    expect(gapSpec()?.readOnly).toBe(true);
  });

  it("goes quiet once any worker has marked the day as incomplete", async () => {
    mocks.anomalyObserve.mockImplementation(overThreshold(1));
    const result = await observeTrackingAnomaly(hit);

    expect(result.shadowReasons).toEqual([]);
  });

  it("marks the day after falling back, so a click taken in-process is not read as none", async () => {
    mocks.anomalyObserve.mockRejectedValueOnce(new Error("redis down"));
    await observeTrackingAnomaly({ ...hit, eventType: "button_click" });

    // Redis is back and has never heard of that click.
    mocks.anomalyObserve.mockImplementation(overThreshold(1));
    const result = await observeTrackingAnomaly({ ...hit, nowMs: baseInput.nowMs + 60_000 });

    expect(gapSpec()?.readOnly).toBe(false);
    expect(result.shadowReasons).toEqual([]);
  });

  it("starts the next day whole again", async () => {
    mocks.anomalyObserve.mockRejectedValueOnce(new Error("redis down"));
    await observeTrackingAnomaly(hit);

    mocks.anomalyObserve.mockImplementation(overThreshold(0));
    const result = await observeTrackingAnomaly({ ...hit, nowMs: baseInput.nowMs + 24 * 60 * 60 * 1000 });

    expect(gapSpec()?.readOnly).toBe(true);
    expect(result.shadowReasons.map(reason => reason.rule)).toEqual(["hosting_range_events_1d"]);
  });
});

describe("one-shot cohort, by day (in-process fallback)", () => {
  beforeEach(() => {
    resetAnomalyScorerForTests();
    setRedisAnomalyEnabledForTests(false);
  });

  const DAY_MS = 86_400_000;
  const dayStart = Math.floor(2_000_000_000_000 / DAY_MS) * DAY_MS;
  const desktop = (version: number) =>
    `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Safari/537.36`;

  interface FleetOptions {
    versions: number[];
    referrer?: string;
    asns?: number;
    revisit?: number;
    userAgent?: (version: number) => string;
  }

  /** `count` desktop pageviews, one per fresh address, spread across the day. */
  const visit = async (count: number, options: FleetOptions) => {
    let result = await observeTrackingAnomaly({ ...baseInput, nowMs: dayStart });
    for (let index = 0; index < count; index++) {
      const actor = Math.floor(index / (options.revisit ?? 1));
      const version = options.versions[actor % options.versions.length];
      result = await observeTrackingAnomaly({
        ...baseInput,
        ipAddress: `10.${Math.floor(actor / 250)}.${actor % 250}.1`,
        userAgent: (options.userAgent ?? desktop)(version),
        screenWidth: 2560,
        screenHeight: 1600,
        language: "en-US",
        referrer: options.referrer ?? "",
        asn: 1000 + (index % (options.asns ?? 60)),
        pathname: `/page-${index}`,
        nowMs: dayStart + index * 60_000,
      });
    }
    return result;
  };

  const flat = [118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129];
  const peaked = [157, 157, 157, 157, 157, 157, 157, 157, 157, 156];

  it("records a one-shot cohort drawing its versions from a list, without convicting", async () => {
    const result = await visit(260, { versions: flat });

    // The verdict would be inherited by every direct visitor on that screen,
    // so it is recorded under both names and scored under neither.
    expect(result.shadowReasons.map(reason => reason.rule)).toEqual([
      "cohort_oneshot_direct_1d",
      "cohort_oneshot_flat_versions_1d",
    ]);
    expect(result.convictingReasons).toEqual([]);
    expect(result.isAnomalous).toBe(false);
  });

  it("records only the shape when the cohort sits on current versions", async () => {
    const result = await visit(260, { versions: peaked });

    // A shared link looks like this too, so it is evidence being gathered.
    expect(result.shadowReasons.map(reason => reason.rule)).toEqual(["cohort_oneshot_direct_1d"]);
    expect(result.convictingReasons).toEqual([]);
    expect(result.isAnomalous).toBe(false);
    expect(result.score).toBe(0);
  });

  it("stays quiet below the daily volume gate", async () => {
    const result = await visit(150, { versions: flat });

    expect(result.shadowReasons).toEqual([]);
    expect(result.isAnomalous).toBe(false);
  });

  it("leaves a cohort alone when its visitors arrive with a referrer", async () => {
    const result = await visit(260, { versions: flat, referrer: "https://www.google.com/" });

    expect(result.shadowReasons).toEqual([]);
    expect(result.reasons.map(reason => reason.rule)).not.toContain("cohort_oneshot_flat_versions_1d");
  });

  it("leaves a cohort alone when its visitors come back for more pages", async () => {
    const result = await visit(260, { versions: flat, revisit: 3 });

    expect(result.shadowReasons).toEqual([]);
  });

  it("leaves a cohort alone when it sits on a handful of networks", async () => {
    const result = await visit(260, { versions: flat, asns: 5 });

    expect(result.shadowReasons).toEqual([]);
  });

  it("does not count a phone cohort, whose screen millions share", async () => {
    const result = await visit(260, {
      versions: flat,
      userAgent: version =>
        `Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Mobile Safari/537.36`,
    });

    expect(result.counters.cohortPageviews1d).toBe(0);
    expect(result.isAnomalous).toBe(false);
  });

  it("spares a visitor in the convicted cohort who arrived from somewhere", async () => {
    await visit(260, { versions: flat });
    const result = await observeTrackingAnomaly({
      ...baseInput,
      ipAddress: "192.0.2.50",
      userAgent: desktop(157),
      screenWidth: 2560,
      screenHeight: 1600,
      language: "en-US",
      referrer: "https://news.ycombinator.com/",
      asn: 7922,
      nowMs: dayStart + 300 * 60_000,
    });

    expect(result.isAnomalous).toBe(false);
  });

  it("judges a vitals event by the cohort its pageviews built, without counting it", async () => {
    const afterPageviews = await visit(260, { versions: flat });
    const vitals = await observeTrackingAnomaly({
      ...baseInput,
      ipAddress: "10.9.9.9",
      userAgent: desktop(120),
      screenWidth: 2560,
      screenHeight: 1600,
      language: "en-US",
      referrer: "",
      asn: 1001,
      eventType: "performance",
      nowMs: dayStart + 300 * 60_000,
    });

    expect(vitals.counters.cohortPageviews1d).toBe(afterPageviews.counters.cohortPageviews1d);
    expect(vitals.counters.cohortDistinctActors1d).toBe(afterPageviews.counters.cohortDistinctActors1d);
    expect(vitals.shadowReasons.map(reason => reason.rule)).toContain("cohort_oneshot_flat_versions_1d");
  });

  it("starts each day from nothing", async () => {
    await visit(260, { versions: flat });
    const result = await observeTrackingAnomaly({
      ...baseInput,
      ipAddress: "10.9.9.9",
      userAgent: desktop(120),
      screenWidth: 2560,
      screenHeight: 1600,
      language: "en-US",
      referrer: "",
      asn: 1001,
      nowMs: dayStart + DAY_MS + 1,
    });

    expect(result.counters.cohortPageviews1d).toBe(1);
    expect(result.isAnomalous).toBe(false);
  });
});

describe("read-only counters (Redis-backed)", () => {
  beforeEach(() => {
    resetAnomalyScorerForTests();
    setRedisAnomalyEnabledForTests(true);
    mocks.anomalyObserve.mockReset();
    mocks.anomalyObserve.mockResolvedValue([]);
  });

  const desktopHit = {
    ...baseInput,
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36",
    screenWidth: 1920,
    screenHeight: 1080,
    language: "en-US",
    isHostingAsn: true,
    asn: 8075,
  };

  const readOnlyByKey = (specs: { key: string; readOnly?: boolean }[]) =>
    Object.fromEntries(specs.map(spec => [spec.key.split(":").slice(0, 3).join(":"), spec.readOnly === true]));

  it("counts a pageview into the day cohort and only reads the interaction counter", async () => {
    await observeTrackingAnomaly(desktopHit);

    const flags = readOnlyByKey(mocks.anomalyObserve.mock.calls[0][1]);
    expect(flags["bot:o:v"]).toBe(false);
    expect(flags["bot:o:a"]).toBe(false);
    expect(flags["bot:o:d"]).toBe(false);
    expect(flags["bot:o:n"]).toBe(false);
    expect(flags["bot:a:hre"]).toBe(false);
    expect(flags["bot:a:hri"]).toBe(true);
  });

  it("only reads the day cohort on a vitals event", async () => {
    await observeTrackingAnomaly({ ...desktopHit, eventType: "performance" });

    const flags = readOnlyByKey(mocks.anomalyObserve.mock.calls[0][1]);
    expect(flags["bot:o:v"]).toBe(true);
    expect(flags["bot:o:a"]).toBe(true);
    expect(flags["bot:o:d"]).toBe(true);
    expect(flags["bot:o:n"]).toBe(true);
  });

  it("does not count a referred pageview as direct", async () => {
    await observeTrackingAnomaly({ ...desktopHit, referrer: "https://www.google.com/" });

    const flags = readOnlyByKey(mocks.anomalyObserve.mock.calls[0][1]);
    expect(flags["bot:o:v"]).toBe(false);
    expect(flags["bot:o:d"]).toBe(true);
  });

  it("counts a click into the interaction counter", async () => {
    await observeTrackingAnomaly({ ...desktopHit, eventType: "button_click" });

    const flags = readOnlyByKey(mocks.anomalyObserve.mock.calls[0][1]);
    expect(flags["bot:a:hri"]).toBe(false);
  });

  it("only reads the screen set on a hit with no screen size", async () => {
    await observeTrackingAnomaly({ ...desktopHit, screenWidth: undefined, screenHeight: undefined });

    const flags = readOnlyByKey(mocks.anomalyObserve.mock.calls[0][1]);
    expect(flags["bot:a:hrs"]).toBe(true);
    expect(flags["bot:a:hre"]).toBe(false);
  });

  it("expires day keys shortly after their UTC day ends, not a day after the last write", async () => {
    const day = 24 * 60 * 60 * 1000;
    // Two hours before midnight UTC.
    await observeTrackingAnomaly({ ...desktopHit, nowMs: 5 * day - 2 * 60 * 60 * 1000 });

    const specs = mocks.anomalyObserve.mock.calls[0][1] as { key: string; windowMs: number }[];
    const dayKeys = specs.filter(spec => spec.key.startsWith("bot:a:hr") || spec.key.startsWith("bot:o:"));
    expect(dayKeys.length).toBeGreaterThan(0);
    for (const spec of dayKeys) {
      expect(spec.windowMs, spec.key).toBe(2 * 60 * 60 * 1000 + 10 * 60 * 1000);
    }
  });

  it("sends no hosting-range counters for a relay or SASE network", async () => {
    for (const asn of [13335, 20940, 22616]) {
      mocks.anomalyObserve.mockClear();
      await observeTrackingAnomaly({ ...desktopHit, asn });

      const keys = (mocks.anomalyObserve.mock.calls[0][1] as { key: string }[]).map(spec => spec.key);
      expect(
        keys.some(key => key.startsWith("bot:a:hr") || key.startsWith("bot:a:gap")),
        String(asn)
      ).toBe(false);
    }
  });

  it("sends no hosting or day-cohort counters for an ordinary phone visitor", async () => {
    await observeTrackingAnomaly(baseInput);

    const keys = (mocks.anomalyObserve.mock.calls[0][1] as { key: string }[]).map(spec => spec.key);
    expect(keys.some(key => key.startsWith("bot:a:hr") || key.startsWith("bot:o:"))).toBe(false);
  });
});
