import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  exists: vi.fn(),
}));

// `multi()` returns a chainable builder; only the second result (the EXISTS on
// the previous bucket) is read back.
vi.mock("../../../db/redis/redis.js", () => ({
  redis: {
    multi: () => ({
      set: () => ({
        exists: () => ({
          exec: async () => [
            [null, "OK"],
            [null, mocks.exists()],
          ],
        }),
      }),
    }),
  },
  anomalyObserve: vi.fn(),
}));

import {
  evaluateEnumerationReading,
  observeEnumeration,
  resetEnumerationObserverForTests,
} from "./enumerationObserver.js";

/** The measured shape of the crawler this rule was built from. */
const crawlerReading = {
  events: 400,
  distinctPaths: 384,
  distinctActors: 342,
  directEvents: 400,
};

describe("evaluateEnumerationReading", () => {
  it("recognises an enumerating cohort", () => {
    const result = evaluateEnumerationReading(crawlerReading);

    expect(result.qualifies).toBe(true);
    expect(result.pathNovelty).toBeGreaterThan(0.9);
    expect(result.eventsPerActor).toBeLessThan(1.25);
  });

  it("leaves ordinary reading traffic alone", () => {
    // A busy content site: visitors read several pages each, and they revisit
    // the same popular ones.
    const result = evaluateEnumerationReading({
      events: 4000,
      distinctPaths: 90,
      distinctActors: 850,
      directEvents: 3960,
    });

    expect(result.qualifies).toBe(false);
  });

  it("leaves a small cohort alone even when its shape matches", () => {
    // Below the volume floor these ratios are noise: twelve visitors who each
    // opened one unlinked page produce exactly the crawler's numbers.
    const result = evaluateEnumerationReading({
      events: 12,
      distinctPaths: 12,
      distinctActors: 12,
      directEvents: 12,
    });

    expect(result.qualifies).toBe(false);
    expect(result.pathNovelty).toBe(1);
  });

  it("leaves a campaign landing burst alone, because it arrives referred", () => {
    // A marketing blast lands on thousands of unique UTM-tagged URLs, one hit
    // per visitor — the crawler's shape in every respect but one.
    const result = evaluateEnumerationReading({
      events: 900,
      distinctPaths: 880,
      distinctActors: 870,
      directEvents: 40,
    });

    expect(result.qualifies).toBe(false);
    expect(result.pathNovelty).toBeGreaterThan(0.9);
  });

  it("reports zeros rather than dividing by zero on an empty bucket", () => {
    const result = evaluateEnumerationReading({
      events: 0,
      distinctPaths: 0,
      distinctActors: 0,
      directEvents: 0,
    });

    expect(result).toMatchObject({ qualifies: false, pathNovelty: 0, eventsPerActor: 0, directShare: 0 });
  });
});

describe("observeEnumeration", () => {
  beforeEach(() => {
    resetEnumerationObserverForTests();
    mocks.exists.mockReset().mockReturnValue(0);
  });

  it("does not mark a cohort on its first qualifying bucket", async () => {
    const result = await observeEnumeration("site:1920x1080:en-us:chrome", 42, crawlerReading);

    expect(result).toMatchObject({ qualifies: true, sustained: false });
  });

  it("marks a cohort once the previous bucket qualified too", async () => {
    mocks.exists.mockReturnValue(1);

    const result = await observeEnumeration("site:1920x1080:en-us:chrome", 43, crawlerReading);

    expect(result).toMatchObject({ qualifies: true, sustained: true });
  });

  it("does not consult the streak for a cohort that did not qualify", async () => {
    const result = await observeEnumeration("site:1920x1080:en-us:chrome", 42, {
      events: 4000,
      distinctPaths: 90,
      distinctActors: 850,
      directEvents: 3960,
    });

    expect(result).toMatchObject({ qualifies: false, sustained: false });
    expect(mocks.exists).not.toHaveBeenCalled();
  });
});
