import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  couponsCreate: vi.fn(),
  subscriptionsList: vi.fn(),
  subscriptionsUpdate: vi.fn(),
  subscriptionsRetrieve: vi.fn(),
  getAppSumoSubscription: vi.fn(),
  invalidateStripeSubscriptionCache: vi.fn(),
  orgRows: [] as Array<{ stripeCustomerId: string | null }>,
}));

vi.mock("./stripe.js", () => ({
  stripe: {
    coupons: { create: mocks.couponsCreate },
    subscriptions: {
      list: mocks.subscriptionsList,
      update: mocks.subscriptionsUpdate,
      retrieve: mocks.subscriptionsRetrieve,
    },
  },
}));

vi.mock("./subscriptionUtils.js", () => ({
  getAppSumoSubscription: mocks.getAppSumoSubscription,
  invalidateStripeSubscriptionCache: mocks.invalidateStripeSubscriptionCache,
}));

vi.mock("./const.js", () => ({
  IS_CLOUD: true,
  getStripePrices: () => [
    { priceId: "price_std250k", name: "standard250k", interval: "month", limits: { events: 250_000, replays: 0 } },
    { priceId: "price_pro100k", name: "pro100k", interval: "month", limits: { events: 100_000, replays: 0 } },
    { priceId: "price_pro250k", name: "pro250k", interval: "month", limits: { events: 250_000, replays: 0 } },
    {
      priceId: "price_pro100k_annual",
      name: "pro100k-annual",
      interval: "year",
      limits: { events: 100_000, replays: 0 },
    },
  ],
}));

vi.mock("../db/postgres/postgres.js", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => mocks.orgRows }) }) }),
    execute: vi.fn(),
  },
}));

import {
  appsumoCreditFor,
  discountsWithAppSumoCredit,
  syncAppSumoCredit,
  syncAppSumoCreditForSubscription,
} from "./appsumoCredit.js";

const log: any = { info: vi.fn(), error: vi.fn() };

function discount(id: string, couponId: string) {
  return { id, coupon: { id: couponId } } as Stripe.Discount;
}

function tier(t: string) {
  mocks.getAppSumoSubscription.mockResolvedValue({ source: "appsumo", tier: t });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAppSumoSubscription.mockResolvedValue(null);
  mocks.couponsCreate.mockResolvedValue({});
  mocks.orgRows = [{ stripeCustomerId: "cus_1" }];
});

describe("appsumoCreditFor", () => {
  it("returns null without a license", async () => {
    expect(await appsumoCreditFor("org_1", "price_pro100k")).toBeNull();
    expect(mocks.couponsCreate).not.toHaveBeenCalled();
  });

  it("reads the license strictly, so a lookup failure fails checkout instead of charging full price", async () => {
    await appsumoCreditFor("org_1", "price_pro100k");
    expect(mocks.getAppSumoSubscription).toHaveBeenCalledWith("org_1", { throwOnError: true });
  });

  it("returns null for Standard plans and unknown prices without reading the license", async () => {
    tier("2");
    expect(await appsumoCreditFor("org_1", "price_std250k")).toBeNull();
    expect(await appsumoCreditFor("org_1", "price_unknown")).toBeNull();
    // A broken license table must not block ordinary checkouts
    expect(mocks.getAppSumoSubscription).not.toHaveBeenCalled();
  });

  it("returns null for a Pro plan smaller than the tier", async () => {
    tier("3"); // 250k events
    expect(await appsumoCreditFor("org_1", "price_pro100k")).toBeNull();
  });

  it("creates a forever amount-off coupon worth the tier's Standard price", async () => {
    tier("2");
    expect(await appsumoCreditFor("org_1", "price_pro250k")).toEqual({
      couponId: "appsumo-credit-t2-1900",
      amountUsd: 19,
    });
    expect(mocks.couponsCreate).toHaveBeenCalledWith({
      id: "appsumo-credit-t2-1900",
      name: "AppSumo Tier 2 credit",
      amount_off: 1900,
      currency: "usd",
      duration: "forever",
      metadata: { appsumoTier: "2" },
    });
  });

  it("credits eight months on annual plans", async () => {
    tier("1");
    expect(await appsumoCreditFor("org_1", "price_pro100k_annual")).toEqual({
      couponId: "appsumo-credit-t1-11200",
      amountUsd: 112,
    });
  });

  // Created coupons are cached per process, so each test below uses a coupon no other test touches.
  it("treats an existing coupon as success and remembers it", async () => {
    tier("1");
    mocks.couponsCreate.mockRejectedValueOnce(
      new Stripe.errors.StripeInvalidRequestError({
        type: "invalid_request_error",
        code: "resource_already_exists",
        message: "Coupon already exists.",
      } as any)
    );
    const expected = { couponId: "appsumo-credit-t1-1400", amountUsd: 14 };

    expect(await appsumoCreditFor("org_1", "price_pro100k")).toEqual(expected);
    expect(await appsumoCreditFor("org_1", "price_pro100k")).toEqual(expected);
    expect(mocks.couponsCreate).toHaveBeenCalledTimes(1);
  });

  it("surfaces other Stripe errors", async () => {
    tier("3");
    mocks.couponsCreate.mockRejectedValueOnce(new Error("Stripe down"));
    await expect(appsumoCreditFor("org_1", "price_pro250k")).rejects.toThrow("Stripe down");
  });
});

describe("discountsWithAppSumoCredit", () => {
  it("adds the credit next to existing discounts", () => {
    expect(discountsWithAppSumoCredit([discount("di_promo", "PROMO")], "appsumo-credit-t2-1900")).toEqual([
      { discount: "di_promo" },
      { coupon: "appsumo-credit-t2-1900" },
    ]);
  });

  it("swaps a credit for another interval's", () => {
    expect(
      discountsWithAppSumoCredit([discount("di_as", "appsumo-credit-t2-1900")], "appsumo-credit-t2-15200")
    ).toEqual([{ coupon: "appsumo-credit-t2-15200" }]);
  });

  it("drops the credit and keeps other discounts", () => {
    expect(
      discountsWithAppSumoCredit([discount("di_promo", "PROMO"), discount("di_as", "appsumo-credit-t2-1900")], null)
    ).toEqual([{ discount: "di_promo" }]);
  });

  it("clears with an empty string when the credit was the only discount", () => {
    expect(discountsWithAppSumoCredit([discount("di_as", "appsumo-credit-t2-1900")], null)).toBe("");
  });

  it("leaves the subscription alone when it already matches", () => {
    expect(discountsWithAppSumoCredit([discount("di_as", "appsumo-credit-t2-1900")], "appsumo-credit-t2-1900")).toBe(
      undefined
    );
    expect(discountsWithAppSumoCredit([discount("di_promo", "PROMO")], null)).toBe(undefined);
    expect(discountsWithAppSumoCredit([], null)).toBe(undefined);
  });
});

describe("syncAppSumoCredit", () => {
  function liveSubscription(discounts: Stripe.Discount[]) {
    mocks.subscriptionsList.mockImplementation(async ({ status }: any) =>
      status === "active"
        ? {
            data: [
              { id: "sub_1", customer: "cus_1", discounts, items: { data: [{ price: { id: "price_pro250k" } }] } },
            ],
          }
        : { data: [] }
    );
  }

  it("removes the credit from the next invoice after a refund", async () => {
    liveSubscription([discount("di_as", "appsumo-credit-t2-1900")]);

    await syncAppSumoCredit("org_1", log);

    expect(mocks.subscriptionsUpdate).toHaveBeenCalledWith("sub_1", { discounts: "", proration_behavior: "none" });
    expect(mocks.invalidateStripeSubscriptionCache).toHaveBeenCalledWith("cus_1");
  });

  it("reaches a past-due subscription, which bills again once payment succeeds", async () => {
    mocks.subscriptionsList.mockImplementation(async ({ status }: any) =>
      status === "past_due"
        ? {
            data: [
              {
                id: "sub_due",
                customer: "cus_1",
                discounts: [discount("di_as", "appsumo-credit-t2-1900")],
                items: { data: [{ price: { id: "price_pro250k" } }] },
              },
            ],
          }
        : { data: [] }
    );

    await syncAppSumoCredit("org_1", log);

    expect(mocks.subscriptionsUpdate).toHaveBeenCalledWith("sub_due", { discounts: "", proration_behavior: "none" });
  });

  it("does nothing when the credit already matches the license", async () => {
    tier("2");
    liveSubscription([discount("di_as", "appsumo-credit-t2-1900")]);

    await syncAppSumoCredit("org_1", log);

    expect(mocks.subscriptionsUpdate).not.toHaveBeenCalled();
  });

  it("does nothing without a Stripe customer", async () => {
    mocks.orgRows = [{ stripeCustomerId: null }];

    await syncAppSumoCredit("org_1", log);

    expect(mocks.subscriptionsList).not.toHaveBeenCalled();
  });

  it("logs instead of throwing when Stripe fails", async () => {
    mocks.subscriptionsList.mockRejectedValue(new Error("Stripe down"));

    await expect(syncAppSumoCredit("org_1", log)).resolves.toBeUndefined();
    expect(log.error).toHaveBeenCalled();
  });
});

describe("syncAppSumoCreditForSubscription", () => {
  function event(overrides: Record<string, unknown> = {}) {
    return {
      id: "sub_1",
      customer: "cus_1",
      discounts: [],
      items: { data: [{ price: { id: "price_pro100k" } }] },
      ...overrides,
    } as unknown as Stripe.Subscription;
  }

  it("skips the Stripe read for subscriptions with no discount and no credit", async () => {
    await syncAppSumoCreditForSubscription("org_1", event(), log);

    expect(mocks.subscriptionsRetrieve).not.toHaveBeenCalled();
    expect(mocks.subscriptionsUpdate).not.toHaveBeenCalled();
  });

  it("re-prices the credit after a plan change made in the billing portal", async () => {
    tier("2");
    // Moved from annual to monthly Pro 100k in the portal, still carrying the annual credit
    const annualCredit = [discount("di_as", "appsumo-credit-t2-15200")];
    mocks.subscriptionsRetrieve.mockResolvedValue(event({ status: "active", discounts: annualCredit }));

    await syncAppSumoCreditForSubscription("org_1", event({ discounts: ["di_as"] }), log);

    expect(mocks.subscriptionsRetrieve).toHaveBeenCalledWith("sub_1", { expand: ["discounts"] });
    expect(mocks.subscriptionsUpdate).toHaveBeenCalledWith("sub_1", {
      discounts: [{ coupon: "appsumo-credit-t2-1900" }],
      proration_behavior: "none",
    });
  });

  it("leaves canceled subscriptions alone", async () => {
    mocks.subscriptionsRetrieve.mockResolvedValue(
      event({ status: "canceled", discounts: [discount("di_as", "appsumo-credit-t2-1900")] })
    );

    await syncAppSumoCreditForSubscription("org_1", event({ discounts: ["di_as"] }), log);

    expect(mocks.subscriptionsUpdate).not.toHaveBeenCalled();
  });
});
