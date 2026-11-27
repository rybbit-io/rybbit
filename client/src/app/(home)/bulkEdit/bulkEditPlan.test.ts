import { describe, expect, it, vi } from "vitest";
import {
  applyPatches,
  buildPlan,
  BulkSite,
  EMPTY_CHOICES,
  LIST_LIMITS,
  restrictPatches,
  toggleSummary,
  validateListValue,
} from "./bulkEditPlan";

const site = (siteId: number, overrides: Partial<BulkSite> = {}) =>
  ({ siteId, name: `site-${siteId}.com`, type: "web", ...overrides }) as BulkSite;

describe("buildPlan: toggles", () => {
  it("patches only the sites whose value would change", () => {
    const sites = [site(1, { sessionReplay: true }), site(2, { sessionReplay: false }), site(3)];
    const plan = buildPlan(sites, { ...EMPTY_CHOICES, toggles: { sessionReplay: "on" } });

    expect(plan.patches).toEqual([
      { siteId: 2, name: "site-2.com", config: { sessionReplay: true } },
      { siteId: 3, name: "site-3.com", config: { sessionReplay: true } },
    ]);
    expect(plan.changes).toEqual([{ kind: "toggle", key: "sessionReplay", value: true, changed: 2 }]);
  });

  it("reads an unset column as its default", () => {
    // trackOutbound and blockBots default on, so turning them on changes nothing.
    const plan = buildPlan([site(1), site(2, { trackOutbound: null })], {
      ...EMPTY_CHOICES,
      toggles: { trackOutbound: "on", blockBots: "on" },
    });
    expect(plan.patches).toEqual([]);
    expect(plan.changes.map(change => change.changed)).toEqual([0, 0]);
  });

  it("leaves web-only settings alone on mobile apps", () => {
    const sites = [site(1), site(2, { type: "mobile" })];
    const plan = buildPlan(sites, { ...EMPTY_CHOICES, toggles: { webVitals: "on", trackErrors: "on" } });

    expect(plan.patches).toEqual([
      { siteId: 1, name: "site-1.com", config: { webVitals: true, trackErrors: true } },
      { siteId: 2, name: "site-2.com", config: { trackErrors: true } },
    ]);
    expect(toggleSummary(sites, "webVitals")).toEqual({ on: 0, total: 1 });
  });

  it("keeps everything when nothing is chosen", () => {
    expect(buildPlan([site(1)], EMPTY_CHOICES)).toEqual({ patches: [], changes: [] });
  });
});

describe("buildPlan: lists", () => {
  it("adds only the entries a site is missing, after its own", () => {
    const sites = [
      site(1, { excludedIPs: ["10.0.0.1"] }),
      site(2, { excludedIPs: ["203.0.113.0/24", "198.51.100.17"] }),
      site(3, { excludedIPs: null }),
    ];
    const plan = buildPlan(sites, {
      ...EMPTY_CHOICES,
      lists: { excludedIPs: { mode: "add", values: ["203.0.113.0/24", " 198.51.100.17 "] } },
    });

    expect(plan.patches).toEqual([
      { siteId: 1, name: "site-1.com", config: { excludedIPs: ["10.0.0.1", "203.0.113.0/24", "198.51.100.17"] } },
      { siteId: 3, name: "site-3.com", config: { excludedIPs: ["203.0.113.0/24", "198.51.100.17"] } },
    ]);
    expect(plan.changes).toEqual([{ kind: "list", key: "excludedIPs", mode: "add", changed: 2, overLimit: 0 }]);
  });

  it("treats differently written ASNs and country codes as the same entry", () => {
    const sites = [site(1, { excludedASNs: ["AS13335"], excludedCountries: ["US"] })];
    const plan = buildPlan(sites, {
      ...EMPTY_CHOICES,
      lists: {
        excludedASNs: { mode: "add", values: ["13335", "as16509"] },
        excludedCountries: { mode: "add", values: ["us", "gb"] },
      },
    });
    expect(plan.patches[0].config).toEqual({
      excludedASNs: ["AS13335", "as16509"],
      excludedCountries: ["US", "GB"],
    });
  });

  it("removes entries from the sites that have them", () => {
    const sites = [site(1, { tags: ["client", "staging"] }), site(2, { tags: ["client"] })];
    const plan = buildPlan(sites, { ...EMPTY_CHOICES, lists: { tags: { mode: "remove", values: ["staging"] } } });
    expect(plan.patches).toEqual([{ siteId: 1, name: "site-1.com", config: { tags: ["client"] } }]);
  });

  it("replaces the list, and clears it when replaced with nothing", () => {
    const sites = [site(1, { excludedPaths: ["/admin/*"] }), site(2, { excludedPaths: ["/preview"] }), site(3)];
    const replaced = buildPlan(sites, {
      ...EMPTY_CHOICES,
      lists: { excludedPaths: { mode: "replace", values: ["/preview"] } },
    });
    expect(replaced.patches.map(patch => patch.siteId)).toEqual([1, 3]);

    const cleared = buildPlan(sites, { ...EMPTY_CHOICES, lists: { excludedPaths: { mode: "replace", values: [] } } });
    expect(cleared.patches).toEqual([
      { siteId: 1, name: "site-1.com", config: { excludedPaths: [] } },
      { siteId: 2, name: "site-2.com", config: { excludedPaths: [] } },
    ]);
  });

  it("ignores adding or removing nothing", () => {
    const plan = buildPlan([site(1, { tags: ["client"] })], {
      ...EMPTY_CHOICES,
      lists: { tags: { mode: "add", values: [] }, excludedIPs: { mode: "remove", values: [" "] } },
    });
    expect(plan).toEqual({ patches: [], changes: [] });
  });

  it("skips a site whose list would pass the limit", () => {
    const full = Array.from({ length: LIST_LIMITS.tags }, (_, i) => `tag-${i}`);
    const plan = buildPlan([site(1, { tags: full }), site(2)], {
      ...EMPTY_CHOICES,
      lists: { tags: { mode: "add", values: ["client"] } },
    });
    expect(plan.patches.map(patch => patch.siteId)).toEqual([2]);
    expect(plan.changes).toEqual([{ kind: "list", key: "tags", mode: "add", changed: 1, overLimit: 1 }]);
  });

  it("merges toggle and list changes into one update per site", () => {
    const plan = buildPlan([site(1)], {
      toggles: { trackCopy: "on" },
      lists: { tags: { mode: "add", values: ["client"] } },
    });
    expect(plan.patches).toEqual([{ siteId: 1, name: "site-1.com", config: { trackCopy: true, tags: ["client"] } }]);
  });
});

describe("buildPlan: entries already on a site", () => {
  const add = (values: string[]) => ({ mode: "add" as const, values });
  const remove = (values: string[]) => ({ mode: "remove" as const, values });

  it("leaves a site's own entries as stored when adding", () => {
    const sites = [site(1, { excludedHostnames: ["Example.com", "example.com"] })];
    // Already there, however it is written: nothing to do.
    expect(buildPlan(sites, { ...EMPTY_CHOICES, lists: { excludedHostnames: add(["EXAMPLE.com"]) } }).patches).toEqual(
      []
    );
    const plan = buildPlan(sites, { ...EMPTY_CHOICES, lists: { excludedHostnames: add(["staging.example.com"]) } });
    expect(plan.patches[0].config.excludedHostnames).toEqual(["Example.com", "example.com", "staging.example.com"]);
  });

  it("matches entries the way tracking does", () => {
    const sites = [
      site(1, {
        excludedPaths: ["/Admin/*", "/preview"],
        excludedQueryParams: ["Preview"],
        excludedASNs: ["AS013335"],
      }),
    ];
    const plan = buildPlan(sites, {
      ...EMPTY_CHOICES,
      lists: {
        excludedPaths: remove(["/admin/*"]),
        excludedQueryParams: remove(["preview"]),
        excludedASNs: remove(["13335"]),
      },
    });
    expect(plan.patches[0].config).toEqual({ excludedPaths: ["/preview"], excludedQueryParams: [], excludedASNs: [] });
  });

  it("keeps tags that differ only by case apart", () => {
    const plan = buildPlan([site(1, { tags: ["Client"] })], { ...EMPTY_CHOICES, lists: { tags: add(["client"]) } });
    expect(plan.patches[0].config.tags).toEqual(["Client", "client"]);
  });

  it("sends country codes the server will accept", () => {
    const plan = buildPlan([site(1, { excludedCountries: ["us", "GB"] })], {
      ...EMPTY_CHOICES,
      lists: { excludedCountries: remove(["gb"]) },
    });
    expect(plan.patches[0].config.excludedCountries).toEqual(["US"]);
  });

  it("reads a stored list that isn't a list of strings as what it can use", () => {
    const sites = [
      site(1, { excludedIPs: "10.0.0.1" as unknown as string[] }),
      site(2, { excludedIPs: [7, "10.0.0.2", null] as unknown as string[] }),
    ];
    const plan = buildPlan(sites, { ...EMPTY_CHOICES, lists: { excludedIPs: add(["10.0.0.3"]) } });
    expect(plan.patches.map(patch => patch.config.excludedIPs)).toEqual([["10.0.0.3"], ["10.0.0.2", "10.0.0.3"]]);
  });
});

describe("restrictPatches", () => {
  const reviewed = [
    { siteId: 1, name: "a", config: { public: true, tags: ["x"] } },
    { siteId: 2, name: "b", config: { public: true } },
  ];

  it("keeps the newer values for what was reviewed", () => {
    const fresh = [{ siteId: 1, name: "a", config: { public: true, tags: ["y", "x"] } }];
    expect(restrictPatches(fresh, reviewed)).toEqual(fresh);
  });

  it("drops sites and settings that weren't in the review", () => {
    const fresh = [
      { siteId: 2, name: "b", config: { public: true, tags: ["x"] } },
      { siteId: 3, name: "c", config: { public: true } },
    ];
    expect(restrictPatches(fresh, reviewed)).toEqual([{ siteId: 2, name: "b", config: { public: true } }]);
  });

  it("drops a site left with nothing reviewed to write", () => {
    expect(restrictPatches([{ siteId: 2, name: "b", config: { tags: ["x"] } }], reviewed)).toEqual([]);
  });
});

describe("validateListValue", () => {
  it("accepts what the server accepts", () => {
    expect(validateListValue("excludedIPs", "203.0.113.0/24")).toBeNull();
    expect(validateListValue("excludedASNs", "AS13335")).toBeNull();
    expect(validateListValue("excludedQueryParams", "utm_source=internal-*")).toBeNull();
    expect(validateListValue("tags", "client")).toBeNull();
  });

  it("names the problem otherwise", () => {
    expect(validateListValue("excludedIPs", "not-an-ip")).toBe("ip");
    expect(validateListValue("excludedASNs", "AS99999999999")).toBe("asn");
    expect(validateListValue("excludedQueryParams", "=internal")).toBe("queryParam");
    expect(validateListValue("tags", "x".repeat(51))).toBe("tooLong");
  });
});

describe("applyPatches", () => {
  const patches = [1, 2, 3, 4, 5].map(siteId => ({ siteId, name: `site-${siteId}.com`, config: { trackCopy: true } }));

  it("updates every site and reports the ones that failed, in order", async () => {
    const update = vi.fn(async (siteId: number) => {
      if (siteId === 2) throw new Error("Session replay requires a Pro plan");
    });
    const onProgress = vi.fn();

    const results = await applyPatches(patches, update, onProgress, 2);

    expect(update).toHaveBeenCalledTimes(5);
    expect(results.map(result => result.patch.siteId)).toEqual([1, 2, 3, 4, 5]);
    expect(results.map(result => result.error)).toEqual([
      undefined,
      "Session replay requires a Pro plan",
      undefined,
      undefined,
      undefined,
    ]);
    expect(onProgress).toHaveBeenLastCalledWith(5);
  });

  it("never runs more updates at once than the limit", async () => {
    let running = 0;
    let peak = 0;
    const update = async () => {
      peak = Math.max(peak, ++running);
      await new Promise(resolve => setTimeout(resolve, 1));
      running--;
    };
    await applyPatches(patches, update, undefined, 2);
    expect(peak).toBe(2);
  });
});
