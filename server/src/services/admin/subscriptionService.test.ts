import { DateTime } from "luxon";
import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The admin org list resolves every organization's plan from one cached account-wide
 * Stripe snapshot plus the AppSumo license table. What matters here is which source wins
 * per org, and that a failure on either side degrades to "free" instead of failing the page.
 */
const state = vi.hoisted(() => ({
  /** Rows returned by the AppSumo license query, one batch at a time. */
  licenses: [] as Array<{ organization_id: string; tier: string }>,
  licenseQueryError: null as Error | null,
  /** Number of licence queries issued — the loop batches at 1000 org ids. */
  licenseQueries: 0,
  stripeEnabled: true,
}));

const mocks = vi.hoisted(() => ({
  getAllStripeSubscriptionsByCustomer: vi.fn(),
}));

vi.mock("../../db/postgres/postgres.js", () => ({
  db: {
    execute: async () => {
      state.licenseQueries += 1;
      if (state.licenseQueryError) {
        throw state.licenseQueryError;
      }
      return state.licenses;
    },
  },
}));

vi.mock("../../lib/stripe.js", () => ({
  get stripe() {
    return state.stripeEnabled ? {} : null;
  },
}));

vi.mock("../../lib/subscriptionUtils.js", () => ({
  getAllStripeSubscriptionsByCustomer: mocks.getAllStripeSubscriptionsByCustomer,
}));

import { APPSUMO_TIER_LIMITS, DEFAULT_EVENT_LIMIT, getStripePrices } from "../../lib/const.js";
import { getOrganizationSubscriptions } from "./subscriptionService.js";

function planByName(name: string) {
  const plan = getStripePrices().find(p => p.name === name);
  if (!plan) {
    throw new Error(`No Stripe plan named ${name}`);
  }
  return plan;
}

const HOUR = 3_600;

function stripeSub(
  overrides: {
    id?: string;
    status?: string;
    priceId?: string;
    interval?: string | null;
    cancelAtPeriodEnd?: boolean;
    periodStart?: number;
    periodEnd?: number;
    noItems?: boolean;
  } = {}
): Stripe.Subscription {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const {
    id = "sub_1",
    status = "active",
    priceId = planByName("pro500k").priceId,
    interval = "month",
    cancelAtPeriodEnd = false,
    periodStart = nowSeconds - 5 * 24 * HOUR,
    periodEnd = nowSeconds + 25 * 24 * HOUR,
    noItems = false,
  } = overrides;

  return {
    id,
    status,
    cancel_at_period_end: cancelAtPeriodEnd,
    items: {
      data: noItems
        ? []
        : [
            {
              current_period_start: periodStart,
              current_period_end: periodEnd,
              price: { id: priceId, recurring: interval === null ? null : { interval } },
            },
          ],
    },
  } as unknown as Stripe.Subscription;
}

function snapshot(entries: Record<string, Stripe.Subscription>) {
  mocks.getAllStripeSubscriptionsByCustomer.mockResolvedValue(new Map(Object.entries(entries)));
}

const nextMonthStart = () => DateTime.now().startOf("month").plus({ months: 1 }).toJSDate();

beforeEach(() => {
  state.licenses = [];
  state.licenseQueryError = null;
  state.licenseQueries = 0;
  state.stripeEnabled = true;
  mocks.getAllStripeSubscriptionsByCustomer.mockReset();
  mocks.getAllStripeSubscriptionsByCustomer.mockResolvedValue(new Map());
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("getOrganizationSubscriptions — free fallback", () => {
  it("returns the free plan for an org with neither Stripe nor AppSumo", async () => {
    const result = await getOrganizationSubscriptions([{ id: "org_1", stripeCustomerId: null }]);

    expect(result.get("org_1")).toEqual({
      id: "",
      source: "free",
      planName: "free",
      status: "free",
      eventLimit: DEFAULT_EVENT_LIMIT,
      currentPeriodEnd: nextMonthStart(),
    });
  });

  it("returns a row for every organization, including ones absent from Stripe", async () => {
    snapshot({ cus_1: stripeSub() });

    const result = await getOrganizationSubscriptions(
      [{ id: "org_1", stripeCustomerId: "cus_1" }, { id: "org_2", stripeCustomerId: "cus_missing" }, { id: "org_3" }],
      true
    );

    expect(result.size).toBe(3);
    expect(result.get("org_2")?.planName).toBe("free");
    expect(result.get("org_3")?.planName).toBe("free");
  });

  it("does not query Stripe at all when it is not configured", async () => {
    state.stripeEnabled = false;

    const result = await getOrganizationSubscriptions([{ id: "org_1", stripeCustomerId: "cus_1" }]);

    expect(mocks.getAllStripeSubscriptionsByCustomer).not.toHaveBeenCalled();
    expect(result.get("org_1")?.planName).toBe("free");
  });

  it("degrades every org to free when the bulk Stripe fetch fails, instead of failing the page", async () => {
    mocks.getAllStripeSubscriptionsByCustomer.mockRejectedValue(new Error("stripe rate limit"));

    const result = await getOrganizationSubscriptions([{ id: "org_1", stripeCustomerId: "cus_1" }], true);

    expect(result.get("org_1")).toMatchObject({ planName: "free", status: "free" });
  });
});

describe("getOrganizationSubscriptions — Stripe plans", () => {
  it("keeps non-active subscriptions so the admin view can show them", async () => {
    snapshot({ cus_1: stripeSub({ status: "past_due" }) });

    const result = await getOrganizationSubscriptions([{ id: "org_1", stripeCustomerId: "cus_1" }], true);

    expect(result.get("org_1")).toMatchObject({ planName: "pro500k", status: "past_due" });
  });

  it("adds periods, interval and event limit only when full details are requested", async () => {
    const plan = planByName("standard250k");
    const periodEnd = Math.floor(Date.now() / 1000) + 10 * 24 * HOUR;
    snapshot({ cus_1: stripeSub({ priceId: plan.priceId, periodEnd, cancelAtPeriodEnd: true }) });

    const withDetails = await getOrganizationSubscriptions([{ id: "org_1", stripeCustomerId: "cus_1" }], true);
    expect(withDetails.get("org_1")).toMatchObject({
      planName: plan.name,
      eventLimit: plan.limits.events,
      interval: "month",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: new Date(periodEnd * 1000),
    });

    const summary = await getOrganizationSubscriptions([{ id: "org_1", stripeCustomerId: "cus_1" }], false);
    const row = summary.get("org_1")!;
    expect(row.planName).toBe(plan.name);
    expect(row.interval).toBeUndefined();
    expect(row.cancelAtPeriodEnd).toBeUndefined();
    // Pinned current behavior: without full details the caller still gets the required
    // eventLimit/currentPeriodEnd fields, filled with placeholders rather than real values.
    expect(row.eventLimit).toBe(0);
    expect(row.currentPeriodEnd).toBeInstanceOf(Date);
  });

  it("labels an unmapped price id as an unknown plan with a zero limit", async () => {
    snapshot({ cus_1: stripeSub({ priceId: "price_not_in_our_catalog" }) });

    const result = await getOrganizationSubscriptions([{ id: "org_1", stripeCustomerId: "cus_1" }], true);

    expect(result.get("org_1")).toMatchObject({ planName: "Unknown Plan", eventLimit: 0 });
  });

  it("falls back to free when the subscription carries no price", async () => {
    snapshot({ cus_1: stripeSub({ noItems: true }) });

    const result = await getOrganizationSubscriptions([{ id: "org_1", stripeCustomerId: "cus_1" }], true);

    expect(result.get("org_1")).toMatchObject({ planName: "free", eventLimit: DEFAULT_EVENT_LIMIT });
  });

  it("reports 'unknown' interval for a price with no recurring block", async () => {
    snapshot({ cus_1: stripeSub({ interval: null }) });

    const result = await getOrganizationSubscriptions([{ id: "org_1", stripeCustomerId: "cus_1" }], true);

    expect(result.get("org_1")?.interval).toBe("unknown");
  });
});

describe("getOrganizationSubscriptions — AppSumo licenses", () => {
  it("maps an active license to its tier limits and a lifetime period", async () => {
    state.licenses = [{ organization_id: "org_1", tier: "3" }];

    const result = await getOrganizationSubscriptions([{ id: "org_1", stripeCustomerId: null }], true);

    expect(result.get("org_1")).toEqual({
      id: "",
      source: "appsumo",
      planName: "appsumo-3",
      status: "active",
      eventLimit: APPSUMO_TIER_LIMITS["3"],
      currentPeriodEnd: nextMonthStart(),
      currentPeriodStart: DateTime.now().startOf("month").toJSDate(),
      cancelAtPeriodEnd: false,
      interval: "lifetime",
    });
  });

  it("omits the lifetime detail fields in summary mode", async () => {
    state.licenses = [{ organization_id: "org_1", tier: "3" }];

    const result = await getOrganizationSubscriptions([{ id: "org_1", stripeCustomerId: null }]);

    expect(result.get("org_1")).toEqual({
      id: "",
      source: "appsumo",
      planName: "appsumo-3",
      status: "active",
      eventLimit: APPSUMO_TIER_LIMITS["3"],
      currentPeriodEnd: nextMonthStart(),
    });
  });

  it("falls back to tier 1 limits for an unrecognized tier", async () => {
    state.licenses = [{ organization_id: "org_1", tier: "99" }];

    const result = await getOrganizationSubscriptions([{ id: "org_1", stripeCustomerId: null }]);

    expect(result.get("org_1")).toMatchObject({
      planName: "appsumo-99",
      eventLimit: APPSUMO_TIER_LIMITS["1"],
    });
  });

  it("degrades to free when the license query fails", async () => {
    state.licenseQueryError = new Error("appsumo schema missing");

    const result = await getOrganizationSubscriptions([{ id: "org_1", stripeCustomerId: null }]);

    expect(result.get("org_1")?.planName).toBe("free");
  });

  it("batches the license lookup at 1000 organization ids", async () => {
    const organizations = Array.from({ length: 2_001 }, (_, i) => ({ id: `org_${i}`, stripeCustomerId: null }));

    await getOrganizationSubscriptions(organizations);

    expect(state.licenseQueries).toBe(3);
  });

  it("skips the license lookup entirely when there are no organizations", async () => {
    const result = await getOrganizationSubscriptions([]);

    expect(result.size).toBe(0);
    expect(state.licenseQueries).toBe(0);
  });
});

describe("getOrganizationSubscriptions — Stripe versus AppSumo", () => {
  it("prefers the Stripe subscription when both sources exist", async () => {
    const plan = planByName("pro1m");
    snapshot({ cus_1: stripeSub({ priceId: plan.priceId }) });
    state.licenses = [{ organization_id: "org_1", tier: "1" }];

    const result = await getOrganizationSubscriptions([{ id: "org_1", stripeCustomerId: "cus_1" }], true);

    expect(result.get("org_1")).toMatchObject({ planName: plan.name, eventLimit: plan.limits.events });
  });

  it("keeps the Stripe subscription even when AppSumo allows more events", async () => {
    const plan = planByName("standard100k");
    snapshot({ cus_1: stripeSub({ priceId: plan.priceId }) });
    state.licenses = [{ organization_id: "org_1", tier: "7" }];

    const result = await getOrganizationSubscriptions([{ id: "org_1", stripeCustomerId: "cus_1" }], true);

    expect(result.get("org_1")).toMatchObject({ planName: plan.name, eventLimit: plan.limits.events });
  });

  it("keeps the Stripe plan on an exact tie", async () => {
    // standard500k and AppSumo tier 4 both allow 500k events.
    const plan = planByName("standard500k");
    expect(plan.limits.events).toBe(APPSUMO_TIER_LIMITS["4"]);
    snapshot({ cus_1: stripeSub({ priceId: plan.priceId }) });
    state.licenses = [{ organization_id: "org_1", tier: "4" }];

    const result = await getOrganizationSubscriptions([{ id: "org_1", stripeCustomerId: "cus_1" }], true);

    expect(result.get("org_1")?.planName).toBe(plan.name);
  });

  it("keeps Stripe precedence in summary mode", async () => {
    snapshot({ cus_1: stripeSub({ priceId: planByName("pro10m").priceId }) });
    state.licenses = [{ organization_id: "org_1", tier: "1" }];

    const result = await getOrganizationSubscriptions([{ id: "org_1", stripeCustomerId: "cus_1" }], false);

    expect(result.get("org_1")).toMatchObject({ planName: "pro10m", source: "stripe" });
  });

  it("resolves each organization independently", async () => {
    snapshot({ cus_1: stripeSub({ priceId: planByName("pro1m").priceId }) });
    state.licenses = [{ organization_id: "org_2", tier: "5" }];

    const result = await getOrganizationSubscriptions(
      [
        { id: "org_1", stripeCustomerId: "cus_1" },
        { id: "org_2", stripeCustomerId: null },
        { id: "org_3", stripeCustomerId: null },
      ],
      true
    );

    expect(result.get("org_1")?.planName).toBe("pro1m");
    expect(result.get("org_2")?.planName).toBe("appsumo-5");
    expect(result.get("org_3")?.planName).toBe("free");
  });

  it("shares one Stripe snapshot across every organization on the page", async () => {
    snapshot({ cus_1: stripeSub(), cus_2: stripeSub({ id: "sub_2" }) });

    await getOrganizationSubscriptions(
      [
        { id: "org_1", stripeCustomerId: "cus_1" },
        { id: "org_2", stripeCustomerId: "cus_2" },
      ],
      true
    );

    expect(mocks.getAllStripeSubscriptionsByCustomer).toHaveBeenCalledTimes(1);
  });
});

describe("getOrganizationSubscriptions — admin overrides", () => {
  it("gives a valid preset override precedence over Stripe and AppSumo", async () => {
    snapshot({ cus_1: stripeSub({ priceId: planByName("pro10m").priceId }) });
    state.licenses = [{ organization_id: "org_1", tier: "7" }];

    const result = await getOrganizationSubscriptions(
      [{ id: "org_1", stripeCustomerId: "cus_1", planOverride: "appsumo-3" }],
      true
    );

    expect(result.get("org_1")).toMatchObject({
      source: "override",
      planName: "appsumo-3",
      eventLimit: APPSUMO_TIER_LIMITS["3"],
      interval: "lifetime",
    });
  });

  it("gives custom limits precedence over a preset override", async () => {
    const result = await getOrganizationSubscriptions(
      [
        {
          id: "org_1",
          planOverride: "pro10m",
          customPlan: { events: 12_000_000, members: 40, websites: null },
        },
      ],
      true
    );

    expect(result.get("org_1")).toMatchObject({
      source: "custom",
      planName: "custom",
      eventLimit: 12_000_000,
      memberLimit: 40,
      siteLimit: null,
    });
  });

  it("ignores an invalid preset override and falls through to the real subscription", async () => {
    snapshot({ cus_1: stripeSub({ priceId: planByName("standard250k").priceId }) });

    const result = await getOrganizationSubscriptions([
      { id: "org_1", stripeCustomerId: "cus_1", planOverride: "not-a-plan" },
    ]);

    expect(result.get("org_1")).toMatchObject({ source: "stripe", planName: "standard250k" });
  });
});
