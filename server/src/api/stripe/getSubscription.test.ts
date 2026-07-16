import { DateTime } from "luxon";
import { describe, expect, it, vi } from "vitest";
import type {
  AppSumoSubscriptionInfo,
  CustomPlanSubscriptionInfo,
  FreeSubscriptionInfo,
  OverrideSubscriptionInfo,
  StripeSubscriptionInfo,
} from "../../lib/subscriptionUtils.js";
import { computeLimits } from "./getSubscription.js";

// getSubscription.ts imports the DB pool and subscription utils (which pull in the
// Stripe client) at module load time. Mock both so importing computeLimits is
// side-effect free.
vi.mock("../../db/postgres/postgres.js", () => ({
  db: {},
}));

vi.mock("../../lib/subscriptionUtils.js", () => ({
  getBestSubscription: vi.fn(),
}));

const START_OF_MONTH = "2026-07-01";

function stripeSubscription(planName: string, overrides: Partial<StripeSubscriptionInfo> = {}): StripeSubscriptionInfo {
  return {
    source: "stripe",
    subscriptionId: "sub_123",
    priceId: "price_123",
    planName,
    eventLimit: 100_000,
    replayLimit: 0,
    periodStart: START_OF_MONTH,
    currentPeriodEnd: new Date("2026-08-01T00:00:00Z"),
    status: "active",
    interval: "month",
    cancelAtPeriodEnd: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function appsumoSubscription(tier: string): AppSumoSubscriptionInfo {
  return {
    source: "appsumo",
    tier,
    eventLimit: 20_000,
    replayLimit: 0,
    periodStart: START_OF_MONTH,
    planName: `appsumo-${tier}`,
    status: "active",
    interval: "lifetime",
    cancelAtPeriodEnd: false,
  };
}

function overrideSubscription(planName: string): OverrideSubscriptionInfo {
  return {
    source: "override",
    planName,
    eventLimit: 100_000,
    replayLimit: 0,
    periodStart: START_OF_MONTH,
    status: "active",
    interval: "month",
    cancelAtPeriodEnd: false,
  };
}

function customSubscription(memberLimit: number | null, siteLimit: number | null): CustomPlanSubscriptionInfo {
  return {
    source: "custom",
    planName: "custom",
    eventLimit: 1_000_000,
    memberLimit,
    siteLimit,
    periodStart: START_OF_MONTH,
    status: "active",
    interval: "lifetime",
    cancelAtPeriodEnd: false,
  };
}

function freeSubscription(): FreeSubscriptionInfo {
  return {
    source: "free",
    eventLimit: 3_000,
    periodStart: START_OF_MONTH,
    planName: "free",
    status: "free",
  };
}

// The legacy cutoff is parsed with DateTime.fromFormat("2025-06-27", "yyyy-MM-dd"),
// i.e. local midnight — compute the same instant here so the boundary tests are
// timezone independent.
const legacyCutoff = DateTime.fromFormat("2025-06-27", "yyyy-MM-dd");

describe("computeLimits", () => {
  describe("custom plans", () => {
    it("returns the plan's own limits verbatim", () => {
      expect(computeLimits(customSubscription(7, 12))).toEqual({ memberLimit: 7, siteLimit: 12 });
    });

    it("passes through null (unlimited) limits", () => {
      expect(computeLimits(customSubscription(null, null))).toEqual({ memberLimit: null, siteLimit: null });
      expect(computeLimits(customSubscription(5, null))).toEqual({ memberLimit: 5, siteLimit: null });
    });
  });

  describe("pro plans", () => {
    it("gives unlimited members and sites", () => {
      expect(computeLimits(stripeSubscription("pro100k"))).toEqual({ memberLimit: null, siteLimit: null });
      expect(computeLimits(stripeSubscription("pro1m-annual"))).toEqual({ memberLimit: null, siteLimit: null });
    });

    it("also applies to override plans containing 'pro'", () => {
      expect(computeLimits(overrideSubscription("pro250k"))).toEqual({ memberLimit: null, siteLimit: null });
    });
  });

  describe("standard plans", () => {
    it("applies the standard tier limits when no Stripe creation date is known", () => {
      expect(computeLimits(stripeSubscription("standard100k"))).toEqual({ memberLimit: 3, siteLimit: 5 });
    });

    it("gives unlimited sites to legacy subscriptions created before 2025-06-27", () => {
      const justBeforeCutoff = new Date(legacyCutoff.toMillis() - 1);
      expect(computeLimits(stripeSubscription("standard100k"), justBeforeCutoff)).toEqual({
        memberLimit: 3,
        siteLimit: null,
      });
    });

    it("applies the site limit to subscriptions created exactly at the 2025-06-27 boundary", () => {
      expect(computeLimits(stripeSubscription("standard100k"), legacyCutoff.toJSDate())).toEqual({
        memberLimit: 3,
        siteLimit: 5,
      });
    });

    it("applies the site limit to subscriptions created after the boundary", () => {
      const afterCutoff = legacyCutoff.plus({ days: 1 }).toJSDate();
      expect(computeLimits(stripeSubscription("standard100k"), afterCutoff)).toEqual({
        memberLimit: 3,
        siteLimit: 5,
      });
    });
  });

  describe("basic plans", () => {
    it("applies the basic tier limits", () => {
      expect(computeLimits(stripeSubscription("basic100k"))).toEqual({ memberLimit: 1, siteLimit: 1 });
    });
  });

  describe("appsumo tiers", () => {
    it("maps tiers 1-5 to their configured limits", () => {
      expect(computeLimits(appsumoSubscription("1"))).toEqual({ memberLimit: 1, siteLimit: 3 });
      expect(computeLimits(appsumoSubscription("2"))).toEqual({ memberLimit: 3, siteLimit: 10 });
      expect(computeLimits(appsumoSubscription("3"))).toEqual({ memberLimit: 10, siteLimit: 25 });
      expect(computeLimits(appsumoSubscription("4"))).toEqual({ memberLimit: 25, siteLimit: 50 });
      expect(computeLimits(appsumoSubscription("5"))).toEqual({ memberLimit: 50, siteLimit: 100 });
    });

    it("gives tiers 6 and 7 unlimited members and sites", () => {
      expect(computeLimits(appsumoSubscription("6"))).toEqual({ memberLimit: null, siteLimit: null });
      expect(computeLimits(appsumoSubscription("7"))).toEqual({ memberLimit: null, siteLimit: null });
    });

    it("does not match tiers outside 1-7, falling through to the free limits", () => {
      // Pinned current behavior: "appsumo-0" / "appsumo-8" fail the ^appsumo-([1-7])$
      // regex, and since the source is "appsumo" (not "override") they fall all the
      // way through to the free-tier limits.
      expect(computeLimits(appsumoSubscription("0"))).toEqual({ memberLimit: 1, siteLimit: 1 });
      expect(computeLimits(appsumoSubscription("8"))).toEqual({ memberLimit: 1, siteLimit: 1 });
    });

    it("matches appsumo tiers on override plans too", () => {
      expect(computeLimits(overrideSubscription("appsumo-3"))).toEqual({ memberLimit: 10, siteLimit: 25 });
    });
  });

  describe("override plans", () => {
    it("defaults unknown override plan names to unlimited", () => {
      expect(computeLimits(overrideSubscription("enterprise-special"))).toEqual({
        memberLimit: null,
        siteLimit: null,
      });
    });
  });

  describe("free tier and unknown plans", () => {
    it("applies the free tier limits", () => {
      expect(computeLimits(freeSubscription())).toEqual({ memberLimit: 1, siteLimit: 1 });
    });

    it("treats unrecognized stripe plan names as free tier", () => {
      // Pinned current behavior: a Stripe plan whose name matches no known tier
      // (e.g. "Unknown Plan" from an unmapped price ID) gets the free-tier limits.
      expect(computeLimits(stripeSubscription("Unknown Plan"))).toEqual({ memberLimit: 1, siteLimit: 1 });
    });

    it("matches plan names case-sensitively", () => {
      // Pinned current behavior: planName.includes("pro") is case sensitive, so a
      // capitalized name falls through to the free-tier limits.
      expect(computeLimits(stripeSubscription("Pro100k"))).toEqual({ memberLimit: 1, siteLimit: 1 });
    });
  });
});
