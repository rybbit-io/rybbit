import { afterAll, describe, expect, it, vi } from "vitest";
import { getStripePrices, STRIPE_TIERS } from "../stripe";
import { EVENT_TIERS, findPriceForTier, formatDate, formatEventTier, planIncludesReplay } from "./planUtils";

// formatDate parses a bare "yyyy-MM-dd" as UTC midnight and then renders it in
// the machine's timezone, so the zone has to be pinned for these assertions to
// mean the same thing everywhere. formatDate builds its formatter per call, so
// stubbing after import is enough.
vi.stubEnv("TZ", "UTC");

afterAll(() => {
  vi.unstubAllEnvs();
});

describe("formatDate", () => {
  it("renders a date string in long US format", () => {
    expect(formatDate("2024-01-15")).toBe("January 15, 2024");
    expect(formatDate("2024-12-31T23:59:59Z")).toBe("December 31, 2024");
  });

  it("renders a Date the same way", () => {
    expect(formatDate(new Date(Date.UTC(2024, 6, 4)))).toBe("July 4, 2024");
  });

  it("falls back to N/A for missing values", () => {
    expect(formatDate(null)).toBe("N/A");
    expect(formatDate(undefined)).toBe("N/A");
    expect(formatDate("")).toBe("N/A");
  });

  it("stays in en-US regardless of the viewer's locale", () => {
    expect(formatDate("2024-03-01")).toBe("March 1, 2024");
  });
});

describe("formatEventTier", () => {
  it("abbreviates millions and thousands", () => {
    expect(formatEventTier(1_000_000)).toBe("1M");
    expect(formatEventTier(2_500_000)).toBe("2.5M");
    expect(formatEventTier(20_000_000)).toBe("20M");
    expect(formatEventTier(100_000)).toBe("100k");
    expect(formatEventTier(500_000)).toBe("500k");
  });

  it("passes string tiers through untouched", () => {
    expect(formatEventTier("Custom")).toBe("Custom");
  });

  it("uses the k suffix below a million, even for tiny numbers", () => {
    expect(formatEventTier(0)).toBe("0k");
    expect(formatEventTier(1_000)).toBe("1k");
  });
});

describe("EVENT_TIERS", () => {
  it("lists the standard monthly tiers, ending with Custom", () => {
    expect(EVENT_TIERS.at(-1)).toBe("Custom");
    expect(EVENT_TIERS.slice(0, -1)).toEqual(STRIPE_TIERS.map(tier => tier.events));
    expect(EVENT_TIERS).toContain(100_000);
  });

  it("is ordered smallest to largest", () => {
    const numeric = EVENT_TIERS.filter((tier): tier is number => typeof tier === "number");

    expect(numeric).toEqual([...numeric].sort((a, b) => a - b));
  });
});

describe("findPriceForTier", () => {
  it("returns null for the custom tier", () => {
    expect(findPriceForTier("Custom", "month")).toBeNull();
    expect(findPriceForTier("Custom", "year", "pro")).toBeNull();
  });

  it("picks the smallest plan that covers the requested event limit", () => {
    const plan = findPriceForTier(100_000, "month");

    expect(plan).toMatchObject({ name: "standard100k", interval: "month", events: 100_000 });
  });

  it("rounds up to the next tier when the limit falls between two", () => {
    expect(findPriceForTier(150_000, "month")).toMatchObject({ name: "standard250k", events: 250_000 });
  });

  it("selects annual plans for the year interval", () => {
    const plan = findPriceForTier(100_000, "year");

    expect(plan).toMatchObject({ name: "standard100k-annual", interval: "year" });
  });

  it("honours the plan type", () => {
    expect(findPriceForTier(250_000, "month", "basic")).toMatchObject({ name: "basic250k" });
    expect(findPriceForTier(250_000, "month", "pro")).toMatchObject({ name: "pro250k" });
    expect(findPriceForTier(250_000, "year", "pro")).toMatchObject({ name: "pro250k-annual" });
  });

  it("defaults to the standard plan type", () => {
    expect(findPriceForTier(100_000, "month")).toEqual(findPriceForTier(100_000, "month", "standard"));
  });

  it("falls back to the largest plan when the limit exceeds every tier", () => {
    const largest = getStripePrices()
      .filter(plan => plan.name.startsWith("standard") && !plan.name.includes("-annual"))
      .at(-1);

    expect(findPriceForTier(999_000_000, "month")).toEqual(largest);
  });

  it("accepts the limit as a numeric string", () => {
    expect(findPriceForTier("100000", "month")).toEqual(findPriceForTier(100_000, "month"));
  });

  it("never returns an annual plan for a monthly interval, or the reverse", () => {
    for (const tier of [100_000, 1_000_000, 10_000_000]) {
      expect(findPriceForTier(tier, "month")!.name).not.toContain("-annual");
      expect(findPriceForTier(tier, "year")!.name).toContain("-annual");
    }
  });
});

describe("planIncludesReplay", () => {
  it("says no when there is no subscription", () => {
    expect(planIncludesReplay(null)).toBe(false);
    expect(planIncludesReplay(undefined)).toBe(false);
  });

  it("includes every pro plan", () => {
    expect(planIncludesReplay({ planName: "pro100k" })).toBe(true);
    expect(planIncludesReplay({ planName: "pro10m-annual" })).toBe(true);
  });

  it("excludes basic and standard plans", () => {
    expect(planIncludesReplay({ planName: "basic100k" })).toBe(false);
    expect(planIncludesReplay({ planName: "standard1m" })).toBe(false);
    expect(planIncludesReplay({ planName: "free" })).toBe(false);
  });

  it("includes custom (enterprise) plans", () => {
    expect(planIncludesReplay({ planName: "custom" })).toBe(true);
  });

  it("includes AppSumo tiers 4 through 7 only", () => {
    for (const tier of [4, 5, 6, 7]) {
      expect(planIncludesReplay({ planName: `appsumo-${tier}` }), `appsumo-${tier}`).toBe(true);
    }
    for (const tier of [1, 2, 3, 8]) {
      expect(planIncludesReplay({ planName: `appsumo-${tier}` }), `appsumo-${tier}`).toBe(false);
    }
  });

  it("excludes large pro trials but keeps small ones", () => {
    expect(planIncludesReplay({ planName: "pro500k", isTrial: true, eventLimit: 500_000 })).toBe(false);
    expect(planIncludesReplay({ planName: "pro1m", isTrial: true, eventLimit: 1_000_000 })).toBe(false);
    expect(planIncludesReplay({ planName: "pro100k", isTrial: true, eventLimit: 100_000 })).toBe(true);
    expect(planIncludesReplay({ planName: "pro500k", isTrial: false, eventLimit: 500_000 })).toBe(true);
  });

  it("treats a trial with no event limit as small", () => {
    expect(planIncludesReplay({ planName: "pro100k", isTrial: true })).toBe(true);
  });
});
