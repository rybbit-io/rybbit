import { appsumoProCredit } from "@rybbit/shared";
import { eq, sql } from "drizzle-orm";
import type { FastifyBaseLogger } from "fastify";
import Stripe from "stripe";
import { db } from "../db/postgres/postgres.js";
import { organization } from "../db/postgres/schema.js";
import { getStripePrices, IS_CLOUD } from "./const.js";
import { stripe } from "./stripe.js";
import { getAppSumoSubscription, invalidateStripeSubscriptionCache } from "./subscriptionUtils.js";

// AppSumo customers on Pro get their license's value off every invoice, as a forever
// amount-off coupon. Coupons are created on first use and named by tier and amount, so a
// changed credit table mints new coupons instead of silently repricing existing ones.
const COUPON_PREFIX = "appsumo-credit-";

export function isAppSumoCreditCoupon(couponId: string): boolean {
  return couponId.startsWith(COUPON_PREFIX);
}

// Coupons known to exist in Stripe, so only the first checkout per coupon pays for the create call
const knownCoupons = new Set<string>();

async function ensureCoupon(tier: string, amountUsd: number): Promise<string> {
  const amountOff = amountUsd * 100;
  const id = `${COUPON_PREFIX}t${tier}-${amountOff}`;
  if (knownCoupons.has(id)) {
    return id;
  }
  try {
    await (stripe as Stripe).coupons.create({
      id,
      name: `AppSumo Tier ${tier} credit`,
      amount_off: amountOff,
      currency: "usd",
      duration: "forever",
      metadata: { appsumoTier: tier },
    });
  } catch (error) {
    if (!(error instanceof Stripe.errors.StripeInvalidRequestError && error.code === "resource_already_exists")) {
      throw error;
    }
  }
  knownCoupons.add(id);
  return id;
}

export interface AppSumoCredit {
  couponId: string;
  /** USD off each invoice of the plan's billing interval */
  amountUsd: number;
}

/**
 * The AppSumo credit a subscription to `priceId` should carry for this organization, or
 * null when the organization has no active license or the plan doesn't qualify.
 * Throws when the license can't be read, so a checkout fails rather than silently charging
 * full price.
 */
export async function appsumoCreditFor(organizationId: string, priceId: string): Promise<AppSumoCredit | null> {
  // Only Pro plans can earn the credit, so other plans never touch the license table (which
  // only exists on cloud): a failed lookup there can't block a Standard checkout.
  const plan = IS_CLOUD ? getStripePrices().find(p => p.priceId === priceId) : undefined;
  if (!plan || !plan.name.startsWith("pro")) {
    return null;
  }
  const license = await getAppSumoSubscription(organizationId, { throwOnError: true });
  if (!license) {
    return null;
  }
  const credit = appsumoProCredit(license.tier, {
    isPro: true,
    interval: plan.interval,
    events: plan.limits.events,
  });
  return credit === null ? null : { couponId: await ensureCoupon(license.tier, credit), amountUsd: credit };
}

/**
 * The `discounts` for a subscription update that swaps its AppSumo credit for `couponId`
 * (or drops it when null) and keeps every other discount, such as a promotion code.
 * Returns undefined when the subscription already carries exactly that credit, and "" when
 * no discounts remain: Stripe clears discounts with an empty string, while an empty array
 * is dropped from the request and would leave the credit in place.
 * `current` must be the subscription's expanded discounts.
 */
export function discountsWithAppSumoCredit(
  current: Array<string | Stripe.Discount>,
  couponId: string | null
): Stripe.Emptyable<Stripe.SubscriptionUpdateParams.Discount[]> | undefined {
  const discounts = current.filter((d): d is Stripe.Discount => typeof d !== "string");
  const credits = discounts.filter(d => isAppSumoCreditCoupon(d.coupon.id));
  const unchanged = couponId ? credits.length === 1 && credits[0].coupon.id === couponId : credits.length === 0;
  if (unchanged) {
    return undefined;
  }
  const next = [
    ...discounts.filter(d => !isAppSumoCreditCoupon(d.coupon.id)).map(d => ({ discount: d.id })),
    ...(couponId ? [{ coupon: couponId }] : []),
  ];
  return next.length > 0 ? next : "";
}

// Subscriptions that can still produce an invoice. A past-due one bills again once its payment
// goes through, so a refund has to reach it too.
const BILLABLE_STATUSES: Stripe.Subscription.Status[] = ["active", "trialing", "past_due", "unpaid"];

/** Sets a subscription's AppSumo credit to what its plan and the organization's license earn. */
async function reconcileSubscription(
  subscription: Stripe.Subscription,
  organizationId: string,
  log: FastifyBaseLogger
): Promise<void> {
  const couponId = (await appsumoCreditFor(organizationId, subscription.items.data[0].price.id))?.couponId ?? null;
  const discounts = discountsWithAppSumoCredit(subscription.discounts, couponId);
  if (discounts === undefined) {
    return;
  }
  await (stripe as Stripe).subscriptions.update(subscription.id, { discounts, proration_behavior: "none" });
  invalidateStripeSubscriptionCache(subscription.customer as string);
  log.info({ organizationId, subscriptionId: subscription.id, couponId }, "Synced AppSumo credit on subscription");
}

/**
 * Brings the AppSumo credit on every billable subscription of an organization in line with
 * its license: after a refund or tier change, an activation, or a checkout (whose coupon was
 * fixed when the session opened). Takes effect from the next invoice.
 */
export async function syncAppSumoCredit(organizationId: string, log: FastifyBaseLogger): Promise<void> {
  if (!stripe) {
    return;
  }
  try {
    const [org] = await db
      .select({ stripeCustomerId: organization.stripeCustomerId })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);
    if (!org?.stripeCustomerId) {
      return;
    }

    const pages = await Promise.all(
      BILLABLE_STATUSES.map(status =>
        (stripe as Stripe).subscriptions.list({
          customer: org.stripeCustomerId!,
          status,
          limit: 10,
          expand: ["data.discounts"],
        })
      )
    );
    for (const subscription of pages.flatMap(page => page.data)) {
      await reconcileSubscription(subscription, organizationId, log);
    }
  } catch (error) {
    // The change that triggered this already went through; a stale credit is fixable by hand.
    log.error({ err: error, organizationId }, "Failed to sync AppSumo credit on subscription");
  }
}

/**
 * Reconciles one subscription Stripe reports as updated. This catches plan changes made
 * outside the app (the billing portal), concurrent plan changes that each kept the credit
 * they read, and a past-due subscription coming back after a refund.
 * Its own update fires another event, which finds nothing left to change.
 */
export async function syncAppSumoCreditForSubscription(
  organizationId: string,
  updated: Stripe.Subscription,
  log: FastifyBaseLogger
): Promise<void> {
  if (!stripe) {
    return;
  }
  try {
    // Most subscriptions carry no discount and earn no credit: skip the Stripe read for them
    const priceId = updated.items.data[0]?.price.id;
    if (updated.discounts.length === 0 && !(priceId && (await appsumoCreditFor(organizationId, priceId)))) {
      return;
    }
    // Event payloads can arrive out of order, so act on the subscription as it is now
    const subscription = await (stripe as Stripe).subscriptions.retrieve(updated.id, { expand: ["discounts"] });
    if (BILLABLE_STATUSES.includes(subscription.status)) {
      await reconcileSubscription(subscription, organizationId, log);
    }
  } catch (error) {
    log.error({ err: error, organizationId }, "Failed to sync AppSumo credit on subscription");
  }
}

/** syncAppSumoCredit for the organization a license belongs to, if any. */
export async function syncAppSumoCreditForLicense(licenseKey: string, log: FastifyBaseLogger): Promise<void> {
  let organizationId: string | null | undefined;
  try {
    const rows = await db.execute(
      sql`SELECT organization_id FROM appsumo.licenses WHERE license_key = ${licenseKey} LIMIT 1`
    );
    organizationId = Array.isArray(rows)
      ? (rows[0] as { organization_id: string | null } | undefined)?.organization_id
      : null;
  } catch (error) {
    log.error({ err: error }, "Failed to look up license organization for AppSumo credit sync");
    return;
  }
  if (organizationId) {
    await syncAppSumoCredit(organizationId, log);
  }
}
