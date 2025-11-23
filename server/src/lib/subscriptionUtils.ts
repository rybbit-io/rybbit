import { sql } from "drizzle-orm";
import { DateTime } from "luxon";
import Stripe from "stripe";
import { db } from "../db/postgres/postgres.js";
import { APPSUMO_TIER_LIMITS, DEFAULT_EVENT_LIMIT, getStripePrices, StripePlan } from "./const.js";
import { stripe } from "./stripe.js";

export interface AppSumoSubscriptionInfo {
  source: "appsumo";
  tier: string;
  eventLimit: number;
  periodStart: string;
  planName: string;
  status: "active";
  interval: "lifetime";
  cancelAtPeriodEnd: false;
  isPro: false;
}

export interface StripeSubscriptionInfo {
  source: "stripe";
  subscriptionId: string;
  priceId: string;
  planName: string;
  eventLimit: number;
  periodStart: string;
  currentPeriodEnd: Date;
  status: string;
  interval: string;
  cancelAtPeriodEnd: boolean;
  isPro: boolean;
  createdAt: Date;
}

export interface FreeSubscriptionInfo {
  source: "free";
  eventLimit: number;
  periodStart: string;
  planName: "free";
  status: "free";
}

export type SubscriptionInfo = AppSumoSubscriptionInfo | StripeSubscriptionInfo | FreeSubscriptionInfo;

/**
 * Gets the first day of the current month in YYYY-MM-DD format
 */
function getStartOfMonth(): string {
  return DateTime.now().startOf("month").toISODate() as string;
}

/**
 * Gets AppSumo subscription info for an organization
 * @returns AppSumo subscription info or null if no active license found
 */
export async function getAppSumoSubscription(organizationId: string): Promise<AppSumoSubscriptionInfo | null> {
  try {
    const appsumoLicense = await db.execute(
      sql`SELECT tier, status FROM appsumo.licenses WHERE organization_id = ${organizationId} AND status = 'active' LIMIT 1`
    );

    if (Array.isArray(appsumoLicense) && appsumoLicense.length > 0) {
      const license = appsumoLicense[0] as any;
      const tier = license.tier as keyof typeof APPSUMO_TIER_LIMITS;
      const eventLimit = APPSUMO_TIER_LIMITS[tier] || APPSUMO_TIER_LIMITS["1"];

      return {
        source: "appsumo",
        tier,
        eventLimit,
        periodStart: getStartOfMonth(),
        planName: `appsumo-${tier}`,
        status: "active",
        interval: "lifetime",
        cancelAtPeriodEnd: false,
        isPro: false,
      };
    }

    return null;
  } catch (error) {
    console.error("Error checking AppSumo license:", error);
    return null;
  }
}

/**
 * Gets Stripe subscription info for an organization
 * @returns Stripe subscription info or null if no active subscription found
 */
export async function getStripeSubscription(
  stripeCustomerId: string | null
): Promise<StripeSubscriptionInfo | null> {
  if (!stripeCustomerId) {
    return null;
  }

  try {
    const subscriptions = await (stripe as Stripe).subscriptions.list({
      customer: stripeCustomerId,
      status: "active",
      limit: 1,
      expand: ["data.plan.product"],
    });

    if (subscriptions.data.length === 0) {
      return null;
    }

    const subscription = subscriptions.data[0];
    const subscriptionItem = subscription.items.data[0];
    const priceId = subscriptionItem.price.id;

    if (!priceId) {
      console.error("Subscription item price ID not found");
      return null;
    }

    // Find corresponding plan details from constants
    const planDetails = getStripePrices().find((plan: StripePlan) => plan.priceId === priceId);

    if (!planDetails) {
      console.error("Plan details not found for price ID:", priceId);
      // Return basic info even without plan details
      return {
        source: "stripe",
        subscriptionId: subscription.id,
        priceId,
        planName: "Unknown Plan",
        eventLimit: 0,
        periodStart: getStartOfMonth(),
        currentPeriodEnd: new Date(subscriptionItem.current_period_end * 1000),
        status: subscription.status,
        interval: subscriptionItem.price.recurring?.interval ?? "unknown",
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        isPro: false,
        createdAt: new Date(subscription.created * 1000),
      };
    }

    // Determine period start
    const currentMonthStart = DateTime.now().startOf("month");
    const subscriptionStartDate = DateTime.fromSeconds(subscriptionItem.current_period_start);

    // If subscription started within current month, use that date; otherwise use month start
    const periodStart =
      subscriptionStartDate >= currentMonthStart
        ? subscriptionStartDate.toISODate() as string
        : getStartOfMonth();

    return {
      source: "stripe",
      subscriptionId: subscription.id,
      priceId,
      planName: planDetails.name,
      eventLimit: planDetails.limits.events,
      periodStart,
      currentPeriodEnd: new Date(subscriptionItem.current_period_end * 1000),
      status: subscription.status,
      interval: subscriptionItem.price.recurring?.interval ?? "unknown",
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      isPro: planDetails.name.includes("pro"),
      createdAt: new Date(subscription.created * 1000),
    };
  } catch (error) {
    console.error("Error fetching Stripe subscription:", error);
    return null;
  }
}

/**
 * Gets the best subscription for an organization (highest event limit)
 * Checks both AppSumo and Stripe subscriptions and returns the one with the higher limit
 * @returns The subscription with the highest event limit, or free tier if none found
 */
export async function getBestSubscription(
  organizationId: string,
  stripeCustomerId: string | null
): Promise<SubscriptionInfo> {
  // Get both subscription types
  const [appsumoSub, stripeSub] = await Promise.all([
    getAppSumoSubscription(organizationId),
    getStripeSubscription(stripeCustomerId),
  ]);

  // If we have both, return the one with higher event limit
  if (appsumoSub && stripeSub) {
    const bestSub = appsumoSub.eventLimit >= stripeSub.eventLimit ? appsumoSub : stripeSub;
    console.log(
      `Organization has both AppSumo (${appsumoSub.eventLimit} events) and Stripe (${stripeSub.eventLimit} events). Using ${bestSub.source} with ${bestSub.eventLimit} events.`
    );
    return bestSub;
  }

  // Return whichever one exists
  if (appsumoSub) return appsumoSub;
  if (stripeSub) return stripeSub;

  // Default to free tier
  return {
    source: "free",
    eventLimit: DEFAULT_EVENT_LIMIT,
    periodStart: getStartOfMonth(),
    planName: "free",
    status: "free",
  };
}
