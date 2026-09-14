import { DateTime } from "luxon";
import type Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * subscriptionUtils talks to exactly two outside systems: Postgres (plan override,
 * custom plan, AppSumo licenses) and Stripe. Both are mocked here; everything else —
 * plan resolution, ranking, caching — is the module's own logic under test.
 */
const state = vi.hoisted(() => ({
  planOverride: null as string | null,
  customPlan: null as { events: number; members?: number | null; websites?: number | null } | null,
  appsumoLicenses: [] as Array<{ tier: string; status: string }>,
  orgSelectError: null as Error | null,
  appsumoError: null as Error | null,
}));

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  stripeEnabled: true,
}));

vi.mock("../db/postgres/postgres.js", () => {
  // Drizzle builders are thenable; both org lookups await `.limit(1)`.
  function chain(rows: () => unknown[]) {
    const builder: any = {
      from: () => builder,
      where: () => builder,
      limit: () => builder,
      then: (resolve: any, reject: any) => {
        if (state.orgSelectError) {
          return Promise.reject(state.orgSelectError).then(resolve, reject);
        }
        return Promise.resolve(rows()).then(resolve, reject);
      },
    };
    return builder;
  }

  return {
    db: {
      // The two org reads are told apart by the column each one selects.
      select: (fields: Record<string, unknown>) =>
        chain(() =>
          "customPlan" in fields ? [{ customPlan: state.customPlan }] : [{ planOverride: state.planOverride }]
        ),
      execute: async () => {
        if (state.appsumoError) {
          throw state.appsumoError;
        }
        return state.appsumoLicenses;
      },
    },
  };
});

vi.mock("./stripe.js", () => ({
  get stripe() {
    return mocks.stripeEnabled ? { subscriptions: { list: mocks.list } } : null;
  },
}));

import { APPSUMO_REPLAY_LIMITS, APPSUMO_TIER_LIMITS, DEFAULT_EVENT_LIMIT, getStripePrices } from "./const.js";
import {
  AppSumoSubscriptionInfo,
  CustomPlanSubscriptionInfo,
  FreeSubscriptionInfo,
  getAllStripeSubscriptionsByCustomer,
  getAppSumoSubscription,
  getBestSubscription,
  getBestSubscriptionFromStripeSub,
  getCustomPlanSubscription,
  getOverrideSubscription,
  getReplayLimit,
  getStripeSubscription,
  invalidateAllStripeSubscriptionsCache,
  invalidateStripeSubscriptionCache,
  OverrideSubscriptionInfo,
  StripeSubscriptionInfo,
  stripeSubscriptionInfoFromSnapshot,
  subscriptionIncludesReplay,
} from "./subscriptionUtils.js";

function planByName(name: string) {
  const plan = getStripePrices().find(p => p.name === name);
  if (!plan) {
    throw new Error(`No Stripe plan named ${name}`);
  }
  return plan;
}

/** Unique customer id per test so the per-customer cache never leaks between them. */
let customerCounter = 0;
function nextCustomer(): string {
  customerCounter += 1;
  return `cus_${customerCounter}`;
}

const HOUR = 3_600;

function stripeSub(
  overrides: {
    id?: string;
    customer?: string;
    status?: string;
    created?: number;
    priceId?: string | undefined;
    interval?: string | null;
    cancelAtPeriodEnd?: boolean;
    trialEnd?: number | null;
    periodStart?: number;
    periodEnd?: number;
    noItems?: boolean;
  } = {}
): Stripe.Subscription {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const {
    id = "sub_1",
    customer = "cus_1",
    status = "active",
    created = nowSeconds - 30 * 24 * HOUR,
    priceId = planByName("pro500k").priceId,
    interval = "month",
    cancelAtPeriodEnd = false,
    trialEnd = null,
    periodStart = nowSeconds - 5 * 24 * HOUR,
    periodEnd = nowSeconds + 25 * 24 * HOUR,
    noItems = false,
  } = overrides;

  return {
    id,
    customer,
    status,
    created,
    cancel_at_period_end: cancelAtPeriodEnd,
    trial_end: trialEnd,
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

/** Stripe's list() is awaited for per-customer reads and async-iterated for the bulk snapshot. */
function listReturns(subs: Stripe.Subscription[]) {
  mocks.list.mockImplementation(() => {
    const result: any = {
      data: subs,
      [Symbol.asyncIterator]: async function* () {
        for (const sub of subs) {
          yield sub;
        }
      },
    };
    return result;
  });
}

/** Per-customer reads await list(); this is how a Stripe outage reaches them. */
function listRejects(message: string) {
  mocks.list.mockImplementation(() => Promise.reject(new Error(message)));
}

/** The bulk snapshot iterates list(); a failure surfaces while paginating. */
function listRejectsWhileIterating(message: string) {
  mocks.list.mockImplementation(() => ({
    async *[Symbol.asyncIterator]() {
      throw new Error(message);
    },
  }));
}

function appsumo(overrides: Partial<AppSumoSubscriptionInfo> = {}): AppSumoSubscriptionInfo {
  return {
    source: "appsumo",
    tier: "4",
    eventLimit: 500_000,
    replayLimit: 500,
    periodStart: "2026-08-01",
    planName: "appsumo-4",
    status: "active",
    interval: "lifetime",
    cancelAtPeriodEnd: false,
    ...overrides,
  };
}

function override(overrides: Partial<OverrideSubscriptionInfo> = {}): OverrideSubscriptionInfo {
  return {
    source: "override",
    planName: "pro500k",
    eventLimit: 500_000,
    replayLimit: 50_000,
    periodStart: "2026-08-01",
    status: "active",
    interval: "month",
    cancelAtPeriodEnd: false,
    ...overrides,
  };
}

function stripeInfo(overrides: Partial<StripeSubscriptionInfo> = {}): StripeSubscriptionInfo {
  return {
    source: "stripe",
    subscriptionId: "sub_1",
    priceId: "price_1",
    planName: "pro500k",
    eventLimit: 500_000,
    replayLimit: 50_000,
    periodStart: "2026-08-01",
    currentPeriodEnd: new Date("2026-09-01T00:00:00Z"),
    status: "active",
    interval: "month",
    cancelAtPeriodEnd: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function custom(overrides: Partial<CustomPlanSubscriptionInfo> = {}): CustomPlanSubscriptionInfo {
  return {
    source: "custom",
    planName: "custom",
    eventLimit: 10_000_000,
    memberLimit: null,
    siteLimit: null,
    periodStart: "2026-08-01",
    status: "active",
    interval: "lifetime",
    cancelAtPeriodEnd: false,
    ...overrides,
  };
}

function free(): FreeSubscriptionInfo {
  return {
    source: "free",
    eventLimit: DEFAULT_EVENT_LIMIT,
    periodStart: "2026-08-01",
    planName: "free",
    status: "free",
  };
}

beforeEach(() => {
  state.planOverride = null;
  state.customPlan = null;
  state.appsumoLicenses = [];
  state.orgSelectError = null;
  state.appsumoError = null;
  mocks.stripeEnabled = true;
  mocks.list.mockReset();
  listReturns([]);
  invalidateAllStripeSubscriptionsCache();
  // These modules log expected failures through console.error; keep test output readable.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("subscriptionIncludesReplay", () => {
  it("includes replay on every custom (enterprise) plan", () => {
    expect(subscriptionIncludesReplay(custom())).toBe(true);
  });

  it("gates Stripe plans on the plan name containing 'pro'", () => {
    expect(subscriptionIncludesReplay(stripeInfo({ planName: "pro100k" }))).toBe(true);
    expect(subscriptionIncludesReplay(stripeInfo({ planName: "pro1m-annual" }))).toBe(true);
    expect(subscriptionIncludesReplay(stripeInfo({ planName: "standard500k" }))).toBe(false);
    expect(subscriptionIncludesReplay(stripeInfo({ planName: "basic100k" }))).toBe(false);
    // Replay quota carried by a non-pro plan is a volume number, not an entitlement.
    expect(subscriptionIncludesReplay(stripeInfo({ planName: "standard500k", replayLimit: 50_000 }))).toBe(false);
  });

  it("excludes trials at or above the 500k event tier, and only those", () => {
    const trial = (eventLimit: number) => stripeInfo({ planName: "pro500k", status: "trialing", eventLimit });

    expect(subscriptionIncludesReplay(trial(500_000))).toBe(false);
    expect(subscriptionIncludesReplay(trial(500_001))).toBe(false);
    expect(subscriptionIncludesReplay(trial(499_999))).toBe(true);
    // The exclusion is trial-only: the same plan, paid, keeps replay.
    expect(subscriptionIncludesReplay(stripeInfo({ planName: "pro500k", status: "active", eventLimit: 500_000 }))).toBe(
      true
    );
  });

  it("gives AppSumo tiers replay exactly when their tier carries a quota", () => {
    for (const [tier, replayLimit] of Object.entries(APPSUMO_REPLAY_LIMITS)) {
      expect(subscriptionIncludesReplay(appsumo({ tier, planName: `appsumo-${tier}`, replayLimit }))).toBe(
        replayLimit > 0
      );
    }
  });

  it("routes AppSumo overrides by quota and Stripe-plan overrides by name", () => {
    expect(subscriptionIncludesReplay(override({ planName: "appsumo-4", replayLimit: 500 }))).toBe(true);
    expect(subscriptionIncludesReplay(override({ planName: "appsumo-1", replayLimit: 0 }))).toBe(false);
    expect(subscriptionIncludesReplay(override({ planName: "pro500k" }))).toBe(true);
    // A Stripe-plan override ignores its replay quota, exactly like a real Stripe plan.
    expect(subscriptionIncludesReplay(override({ planName: "standard500k", replayLimit: 50_000 }))).toBe(false);
  });

  it("never includes replay on the free tier", () => {
    expect(subscriptionIncludesReplay(free())).toBe(false);
  });
});

describe("getReplayLimit", () => {
  it("treats custom plans as uncapped", () => {
    expect(getReplayLimit(custom())).toBe(Infinity);
  });

  it("reports the plan's own quota for stripe, override and appsumo plans", () => {
    expect(getReplayLimit(stripeInfo({ replayLimit: 50_000 }))).toBe(50_000);
    expect(getReplayLimit(override({ replayLimit: 500 }))).toBe(500);
    expect(getReplayLimit(appsumo({ replayLimit: 1_000 }))).toBe(1_000);
  });

  it("reports zero for the free tier", () => {
    expect(getReplayLimit(free())).toBe(0);
  });

  it("reports zero for plans that carry replay quota but no entitlement", () => {
    // getReplayLimit is only meaningful alongside subscriptionIncludesReplay; an
    // AppSumo tier without replay reports 0 on both.
    const tier1 = appsumo({ tier: "1", planName: "appsumo-1", replayLimit: 0 });
    expect(subscriptionIncludesReplay(tier1)).toBe(false);
    expect(getReplayLimit(tier1)).toBe(0);
  });
});

describe("getStripeSubscription", () => {
  it("returns null without touching Stripe when the org has no customer id", async () => {
    await expect(getStripeSubscription(null)).resolves.toBeNull();
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it("builds subscription info from the plan matching the price id", async () => {
    const plan = planByName("pro500k");
    const customer = nextCustomer();
    listReturns([stripeSub({ customer, priceId: plan.priceId })]);

    const info = await getStripeSubscription(customer);

    expect(info).toMatchObject({
      source: "stripe",
      planName: plan.name,
      eventLimit: plan.limits.events,
      replayLimit: plan.limits.replays,
      status: "active",
      interval: "month",
      cancelAtPeriodEnd: false,
    });
  });

  it("ignores canceled and past_due subscriptions and picks the newest active/trialing one", async () => {
    const customer = nextCustomer();
    const now = Math.floor(Date.now() / 1000);
    listReturns([
      stripeSub({ id: "sub_canceled", customer, status: "canceled", created: now }),
      stripeSub({ id: "sub_past_due", customer, status: "past_due", created: now }),
      stripeSub({ id: "sub_old", customer, status: "active", created: now - 1000 }),
      stripeSub({ id: "sub_new", customer, status: "trialing", created: now - 10, trialEnd: now + 1000 }),
    ]);

    const info = await getStripeSubscription(customer);

    expect(info?.subscriptionId).toBe("sub_new");
    expect(info?.trialEnd).toEqual(new Date((now + 1000) * 1000));
  });

  it("returns null when the customer has no active or trialing subscription", async () => {
    const customer = nextCustomer();
    listReturns([stripeSub({ customer, status: "canceled" })]);

    await expect(getStripeSubscription(customer)).resolves.toBeNull();
  });

  it("falls back to placeholder plan details for an unmapped price id", async () => {
    const customer = nextCustomer();
    listReturns([stripeSub({ customer, priceId: "price_not_in_our_catalog" })]);

    const info = await getStripeSubscription(customer);

    expect(info).toMatchObject({ planName: "Unknown Plan", eventLimit: 0, replayLimit: 0 });
  });

  it("returns null when the subscription carries no price", async () => {
    const customer = nextCustomer();
    listReturns([stripeSub({ customer, noItems: true })]);

    await expect(getStripeSubscription(customer)).resolves.toBeNull();
  });

  it("reports 'unknown' interval for a price with no recurring block", async () => {
    const customer = nextCustomer();
    listReturns([stripeSub({ customer, interval: null })]);

    await expect(getStripeSubscription(customer)).resolves.toMatchObject({ interval: "unknown" });
  });

  it("uses the subscription's own start date as periodStart when the period began this month", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 20, 12));
    const startedThisMonth = DateTime.local(2026, 8, 5, 9);
    const customer = nextCustomer();
    listReturns([stripeSub({ customer, periodStart: Math.floor(startedThisMonth.toMillis() / 1000) })]);

    const info = await getStripeSubscription(customer);

    expect(info?.periodStart).toBe(startedThisMonth.toISODate());
  });

  it("falls back to the start of the month when the period began earlier", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 20, 12));
    const startedLastMonth = DateTime.local(2026, 7, 5, 9);
    const customer = nextCustomer();
    listReturns([stripeSub({ customer, periodStart: Math.floor(startedLastMonth.toMillis() / 1000) })]);

    const info = await getStripeSubscription(customer);

    expect(info?.periodStart).toBe(DateTime.local(2026, 8, 1).toISODate());
  });
});

describe("getStripeSubscription caching", () => {
  it("serves repeat reads for the same customer from cache", async () => {
    const customer = nextCustomer();
    listReturns([stripeSub({ customer })]);

    await getStripeSubscription(customer);
    await getStripeSubscription(customer);

    expect(mocks.list).toHaveBeenCalledTimes(1);
  });

  it("caches a negative result too, so free orgs do not re-query Stripe", async () => {
    const customer = nextCustomer();
    listReturns([]);

    await expect(getStripeSubscription(customer)).resolves.toBeNull();
    await expect(getStripeSubscription(customer)).resolves.toBeNull();
    expect(mocks.list).toHaveBeenCalledTimes(1);
  });

  it("refetches after invalidation, so a plan change is visible immediately", async () => {
    const customer = nextCustomer();
    listReturns([stripeSub({ customer, priceId: planByName("standard100k").priceId })]);
    await getStripeSubscription(customer);

    invalidateStripeSubscriptionCache(customer);
    listReturns([stripeSub({ customer, priceId: planByName("pro1m").priceId })]);

    await expect(getStripeSubscription(customer)).resolves.toMatchObject({ planName: "pro1m" });
    expect(mocks.list).toHaveBeenCalledTimes(2);
  });

  it("leaves other customers' cache entries alone when one is invalidated", async () => {
    const kept = nextCustomer();
    const dropped = nextCustomer();
    listReturns([stripeSub({ customer: kept }), stripeSub({ customer: dropped })]);
    await getStripeSubscription(kept);
    await getStripeSubscription(dropped);

    invalidateStripeSubscriptionCache(dropped);

    await getStripeSubscription(kept);
    expect(mocks.list).toHaveBeenCalledTimes(2);

    await getStripeSubscription(dropped);
    expect(mocks.list).toHaveBeenCalledTimes(3);
  });

  it("tolerates a null customer id being invalidated", async () => {
    const customer = nextCustomer();
    listReturns([stripeSub({ customer })]);
    await getStripeSubscription(customer);

    invalidateStripeSubscriptionCache(null);

    await getStripeSubscription(customer);
    expect(mocks.list).toHaveBeenCalledTimes(1);
  });

  it("refetches once the 60s TTL has elapsed", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 20, 12, 0, 0));
    const customer = nextCustomer();
    listReturns([stripeSub({ customer })]);
    await getStripeSubscription(customer);

    vi.setSystemTime(new Date(2026, 7, 20, 12, 0, 59));
    await getStripeSubscription(customer);
    expect(mocks.list).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date(2026, 7, 20, 12, 1, 1));
    await getStripeSubscription(customer);
    expect(mocks.list).toHaveBeenCalledTimes(2);
  });

  it("prefers a stale cached value over downgrading a paying customer on a Stripe failure", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 20, 12, 0, 0));
    const customer = nextCustomer();
    listReturns([stripeSub({ customer, priceId: planByName("pro1m").priceId })]);
    await getStripeSubscription(customer);

    vi.setSystemTime(new Date(2026, 7, 20, 12, 5, 0));
    listRejects("stripe is down");

    // Even with throwOnError, a cached value wins over the error.
    await expect(getStripeSubscription(customer, { throwOnError: true })).resolves.toMatchObject({
      planName: "pro1m",
    });
  });

  it("returns null on a Stripe failure with nothing cached, or throws when the caller opts in", async () => {
    const customer = nextCustomer();
    listRejects("stripe is down");

    await expect(getStripeSubscription(customer, { throwOnError: true })).rejects.toThrow("stripe is down");
    await expect(getStripeSubscription(nextCustomer())).resolves.toBeNull();
  });
});

describe("getAllStripeSubscriptionsByCustomer", () => {
  it("returns an empty map when Stripe is not configured", async () => {
    mocks.stripeEnabled = false;

    await expect(getAllStripeSubscriptionsByCustomer()).resolves.toEqual(new Map());
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it("prefers an active subscription over a canceled one created later", async () => {
    const now = Math.floor(Date.now() / 1000);
    listReturns([
      stripeSub({ id: "sub_active_old", customer: "cus_rank", status: "active", created: now - 100_000 }),
      stripeSub({ id: "sub_canceled_new", customer: "cus_rank", status: "canceled", created: now }),
    ]);

    const snapshot = await getAllStripeSubscriptionsByCustomer();

    expect(snapshot.get("cus_rank")?.id).toBe("sub_active_old");
  });

  it("prefers trialing over canceled, and the newest among equally active ones", async () => {
    const now = Math.floor(Date.now() / 1000);
    listReturns([
      stripeSub({ id: "sub_canceled", customer: "cus_a", status: "canceled", created: now }),
      stripeSub({ id: "sub_trialing", customer: "cus_a", status: "trialing", created: now - 50_000 }),
      stripeSub({ id: "sub_b_old", customer: "cus_b", status: "active", created: now - 10 }),
      stripeSub({ id: "sub_b_new", customer: "cus_b", status: "active", created: now }),
    ]);

    const snapshot = await getAllStripeSubscriptionsByCustomer();

    expect(snapshot.get("cus_a")?.id).toBe("sub_trialing");
    expect(snapshot.get("cus_b")?.id).toBe("sub_b_new");
  });

  it("keeps the newest of several non-active subscriptions when no active one exists", async () => {
    const now = Math.floor(Date.now() / 1000);
    listReturns([
      stripeSub({ id: "sub_older", customer: "cus_c", status: "canceled", created: now - 5_000 }),
      stripeSub({ id: "sub_newer", customer: "cus_c", status: "past_due", created: now }),
    ]);

    const snapshot = await getAllStripeSubscriptionsByCustomer();

    expect(snapshot.get("cus_c")?.id).toBe("sub_newer");
  });

  it("resolves a customer object rather than a bare id", async () => {
    const sub = stripeSub({ id: "sub_obj" });
    (sub as any).customer = { id: "cus_object", object: "customer" };
    listReturns([sub]);

    const snapshot = await getAllStripeSubscriptionsByCustomer();

    expect(snapshot.get("cus_object")?.id).toBe("sub_obj");
  });

  it("caches the account-wide snapshot until it is invalidated", async () => {
    listReturns([stripeSub({ customer: "cus_snap" })]);

    await getAllStripeSubscriptionsByCustomer();
    await getAllStripeSubscriptionsByCustomer();
    expect(mocks.list).toHaveBeenCalledTimes(1);

    invalidateAllStripeSubscriptionsCache();
    await getAllStripeSubscriptionsByCustomer();
    expect(mocks.list).toHaveBeenCalledTimes(2);
  });

  it("is also dropped by a per-customer invalidation, so admin reads see the change", async () => {
    listReturns([stripeSub({ customer: "cus_snap2" })]);
    await getAllStripeSubscriptionsByCustomer();

    invalidateStripeSubscriptionCache("cus_snap2");
    await getAllStripeSubscriptionsByCustomer();

    expect(mocks.list).toHaveBeenCalledTimes(2);
  });

  it("collapses concurrent refreshes into a single pagination", async () => {
    listReturns([stripeSub({ customer: "cus_concurrent" })]);

    const [a, b, c] = await Promise.all([
      getAllStripeSubscriptionsByCustomer(),
      getAllStripeSubscriptionsByCustomer(),
      getAllStripeSubscriptionsByCustomer(),
    ]);

    expect(mocks.list).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("clears the in-flight guard when pagination fails, so the next call retries", async () => {
    listRejectsWhileIterating("stripe is down");
    await expect(getAllStripeSubscriptionsByCustomer()).rejects.toThrow("stripe is down");

    listReturns([stripeSub({ customer: "cus_retry" })]);
    const snapshot = await getAllStripeSubscriptionsByCustomer();

    expect(snapshot.get("cus_retry")).toBeDefined();
  });
});

describe("stripeSubscriptionInfoFromSnapshot", () => {
  it("resolves an active subscription to the same shape as a direct lookup", () => {
    const plan = planByName("pro500k");
    const snapshot = new Map([["cus_x", stripeSub({ customer: "cus_x", priceId: plan.priceId })]]);

    expect(stripeSubscriptionInfoFromSnapshot(snapshot, "cus_x")).toMatchObject({
      source: "stripe",
      planName: plan.name,
      eventLimit: plan.limits.events,
    });
  });

  it("treats canceled and past_due subscriptions as no subscription at all", () => {
    for (const status of ["canceled", "past_due", "incomplete", "unpaid"]) {
      const snapshot = new Map([["cus_x", stripeSub({ customer: "cus_x", status })]]);
      expect(stripeSubscriptionInfoFromSnapshot(snapshot, "cus_x")).toBeNull();
    }
  });

  it("returns null for a missing customer id or a customer absent from the snapshot", () => {
    const snapshot = new Map([["cus_x", stripeSub({ customer: "cus_x" })]]);

    expect(stripeSubscriptionInfoFromSnapshot(snapshot, null)).toBeNull();
    expect(stripeSubscriptionInfoFromSnapshot(snapshot, "cus_absent")).toBeNull();
  });
});

describe("getOverrideSubscription", () => {
  it("returns null when the organization has no override", async () => {
    await expect(getOverrideSubscription("org_1")).resolves.toBeNull();
  });

  it("maps an appsumo tier override to that tier's event and replay limits", async () => {
    state.planOverride = "appsumo-5";

    await expect(getOverrideSubscription("org_1")).resolves.toMatchObject({
      source: "override",
      planName: "appsumo-5",
      eventLimit: APPSUMO_TIER_LIMITS["5"],
      replayLimit: APPSUMO_REPLAY_LIMITS["5"],
      interval: "lifetime",
      status: "active",
    });
  });

  it("maps a Stripe plan override to that plan's limits and interval", async () => {
    const plan = planByName("standard250k");
    state.planOverride = plan.name;

    await expect(getOverrideSubscription("org_1")).resolves.toMatchObject({
      planName: plan.name,
      eventLimit: plan.limits.events,
      replayLimit: plan.limits.replays,
      interval: plan.interval,
    });
  });

  it("rejects an override naming no known plan, including out-of-range appsumo tiers", async () => {
    for (const planOverride of ["not-a-plan", "appsumo-0", "appsumo-8", "appsumo-12"]) {
      state.planOverride = planOverride;
      await expect(getOverrideSubscription("org_1")).resolves.toBeNull();
    }
  });

  it("returns null instead of throwing when the lookup fails", async () => {
    state.orgSelectError = new Error("pg down");

    await expect(getOverrideSubscription("org_1")).resolves.toBeNull();
  });
});

describe("getCustomPlanSubscription", () => {
  it("returns null when the organization has no custom plan", async () => {
    await expect(getCustomPlanSubscription("org_1")).resolves.toBeNull();
  });

  it("maps the stored plan, treating missing member/site caps as unlimited", async () => {
    state.customPlan = { events: 25_000_000 };

    await expect(getCustomPlanSubscription("org_1")).resolves.toEqual({
      source: "custom",
      planName: "custom",
      eventLimit: 25_000_000,
      memberLimit: null,
      siteLimit: null,
      periodStart: DateTime.now().startOf("month").toISODate(),
      status: "active",
      interval: "lifetime",
      cancelAtPeriodEnd: false,
    });
  });

  it("carries explicit member and site caps through", async () => {
    state.customPlan = { events: 1_000_000, members: 7, websites: 12 };

    await expect(getCustomPlanSubscription("org_1")).resolves.toMatchObject({ memberLimit: 7, siteLimit: 12 });
  });

  it("returns null instead of throwing when the lookup fails", async () => {
    state.orgSelectError = new Error("pg down");

    await expect(getCustomPlanSubscription("org_1")).resolves.toBeNull();
  });
});

describe("getAppSumoSubscription", () => {
  it("maps an active license to its tier limits", async () => {
    state.appsumoLicenses = [{ tier: "6", status: "active" }];

    await expect(getAppSumoSubscription("org_1")).resolves.toMatchObject({
      source: "appsumo",
      tier: "6",
      planName: "appsumo-6",
      eventLimit: APPSUMO_TIER_LIMITS["6"],
      replayLimit: APPSUMO_REPLAY_LIMITS["6"],
    });
  });

  it("falls back to tier 1 limits (and no replay) for an unrecognized tier", async () => {
    state.appsumoLicenses = [{ tier: "99", status: "active" }];

    await expect(getAppSumoSubscription("org_1")).resolves.toMatchObject({
      planName: "appsumo-99",
      eventLimit: APPSUMO_TIER_LIMITS["1"],
      replayLimit: 0,
    });
  });

  it("returns null when there is no license", async () => {
    await expect(getAppSumoSubscription("org_1")).resolves.toBeNull();
  });

  it("returns null instead of throwing when the lookup fails", async () => {
    state.appsumoError = new Error("appsumo schema missing");

    await expect(getAppSumoSubscription("org_1")).resolves.toBeNull();
  });
});

describe("getBestSubscription priority", () => {
  it("puts a custom plan above every other source", async () => {
    state.customPlan = { events: 9_000_000 };
    state.planOverride = "appsumo-7";
    state.appsumoLicenses = [{ tier: "7", status: "active" }];
    const customer = nextCustomer();
    listReturns([stripeSub({ customer })]);

    await expect(getBestSubscription("org_1", customer)).resolves.toMatchObject({ source: "custom" });
  });

  it("puts an override above Stripe and AppSumo", async () => {
    state.planOverride = "standard1m";
    state.appsumoLicenses = [{ tier: "7", status: "active" }];
    const customer = nextCustomer();
    listReturns([stripeSub({ customer })]);

    await expect(getBestSubscription("org_1", customer)).resolves.toMatchObject({
      source: "override",
      planName: "standard1m",
    });
  });

  it("prefers Stripe over AppSumo even when the AppSumo tier allows more events", async () => {
    // Pinned current behavior: despite the "highest limit" wording in the doc comment,
    // any active Stripe subscription wins outright over an AppSumo license.
    state.appsumoLicenses = [{ tier: "7", status: "active" }];
    const customer = nextCustomer();
    const smallPlan = planByName("standard100k");
    listReturns([stripeSub({ customer, priceId: smallPlan.priceId })]);

    const best = await getBestSubscription("org_1", customer);

    expect(best).toMatchObject({ source: "stripe", eventLimit: smallPlan.limits.events });
    expect(best.eventLimit).toBeLessThan(APPSUMO_TIER_LIMITS["7"]);
  });

  it("falls back to AppSumo when there is no Stripe subscription", async () => {
    state.appsumoLicenses = [{ tier: "2", status: "active" }];

    await expect(getBestSubscription("org_1", nextCustomer())).resolves.toMatchObject({
      source: "appsumo",
      eventLimit: APPSUMO_TIER_LIMITS["2"],
    });
  });

  it("falls back to the free tier when nothing else applies", async () => {
    await expect(getBestSubscription("org_1", null)).resolves.toEqual({
      source: "free",
      planName: "free",
      status: "free",
      eventLimit: DEFAULT_EVENT_LIMIT,
      periodStart: DateTime.now().startOf("month").toISODate(),
    });
  });

  it("propagates a Stripe failure when the caller opts in rather than downgrading to free", async () => {
    listRejects("stripe is down");

    await expect(getBestSubscription("org_1", nextCustomer(), { throwOnStripeError: true })).rejects.toThrow(
      "stripe is down"
    );
    await expect(getBestSubscription("org_1", nextCustomer())).resolves.toMatchObject({ source: "free" });
  });
});

describe("getBestSubscriptionFromStripeSub", () => {
  it("applies the same custom > override > stripe > appsumo > free order without calling Stripe", async () => {
    const resolved = stripeInfo();

    state.customPlan = { events: 5_000_000 };
    await expect(getBestSubscriptionFromStripeSub("org_1", resolved)).resolves.toMatchObject({ source: "custom" });

    state.customPlan = null;
    state.planOverride = "pro1m";
    await expect(getBestSubscriptionFromStripeSub("org_1", resolved)).resolves.toMatchObject({ source: "override" });

    state.planOverride = null;
    state.appsumoLicenses = [{ tier: "7", status: "active" }];
    await expect(getBestSubscriptionFromStripeSub("org_1", resolved)).resolves.toMatchObject({ source: "stripe" });

    await expect(getBestSubscriptionFromStripeSub("org_1", null)).resolves.toMatchObject({ source: "appsumo" });

    state.appsumoLicenses = [];
    await expect(getBestSubscriptionFromStripeSub("org_1", null)).resolves.toMatchObject({ source: "free" });

    expect(mocks.list).not.toHaveBeenCalled();
  });
});
