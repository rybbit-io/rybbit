import { eq, sql } from "drizzle-orm";
import { DateTime } from "luxon";
import Stripe from "stripe";
import { db } from "../db/postgres/postgres.js";
import { organization } from "../db/postgres/schema.js";
import {
  APPSUMO_REPLAY_LIMITS,
  APPSUMO_TIER_LIMITS,
  DEFAULT_EVENT_LIMIT,
  getStripePrices,
  StripePlan,
} from "./const.js";
import { stripe } from "./stripe.js";
import { logger } from "./logger/logger.js";

export interface AppSumoSubscriptionInfo {
  source: "appsumo";
  tier: string;
  eventLimit: number;
  replayLimit: number;
  periodStart: string;
  planName: string;
  status: "active";
  interval: "lifetime";
  cancelAtPeriodEnd: false;
}

export interface StripeSubscriptionInfo {
  source: "stripe";
  subscriptionId: string;
  priceId: string;
  planName: string;
  eventLimit: number;
  replayLimit: number;
  periodStart: string;
  currentPeriodEnd: Date;
  status: string;
  interval: string;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  trialEnd?: Date;
}

export interface FreeSubscriptionInfo {
  source: "free";
  eventLimit: number;
  periodStart: string;
  planName: "free";
  status: "free";
}

export interface OverrideSubscriptionInfo {
  source: "override";
  planName: string;
  eventLimit: number;
  replayLimit: number;
  periodStart: string;
  status: "active";
  interval: "month" | "year" | "lifetime";
  cancelAtPeriodEnd: false;
}

export interface CustomPlanSubscriptionInfo {
  source: "custom";
  planName: "custom";
  eventLimit: number;
  memberLimit: number | null; // null = unlimited
  siteLimit: number | null; // null = unlimited
  periodStart: string;
  status: "active";
  interval: "lifetime";
  cancelAtPeriodEnd: false;
}

export type SubscriptionInfo =
  | AppSumoSubscriptionInfo
  | StripeSubscriptionInfo
  | FreeSubscriptionInfo
  | OverrideSubscriptionInfo
  | CustomPlanSubscriptionInfo;

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
        replayLimit: APPSUMO_REPLAY_LIMITS[tier] ?? 0,
        periodStart: getStartOfMonth(),
        planName: `appsumo-${tier}`,
        status: "active",
        interval: "lifetime",
        cancelAtPeriodEnd: false,
      };
    }

    return null;
  } catch (error) {
    console.error("Error checking AppSumo license:", error);
    return null;
  }
}

/**
 * Gets plan override subscription info for an organization
 * @returns Override subscription info or null if no override set
 */
export async function getOverrideSubscription(organizationId: string): Promise<OverrideSubscriptionInfo | null> {
  try {
    const orgResult = await db
      .select({ planOverride: organization.planOverride })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    const org = orgResult[0];
    if (!org?.planOverride) {
      return null;
    }

    // Check if it's an AppSumo tier override (e.g., "appsumo-1", "appsumo-2", "appsumo-3", "appsumo-4", "appsumo-5", "appsumo-6")
    const appsumoMatch = org.planOverride.match(/^appsumo-([123456])$/);
    if (appsumoMatch) {
      const tier = appsumoMatch[1] as keyof typeof APPSUMO_TIER_LIMITS;
      const eventLimit = APPSUMO_TIER_LIMITS[tier];

      return {
        source: "override",
        planName: org.planOverride,
        eventLimit,
        replayLimit: APPSUMO_REPLAY_LIMITS[tier] ?? 0,
        periodStart: getStartOfMonth(),
        status: "active",
        interval: "lifetime",
        cancelAtPeriodEnd: false,
      };
    }

    // Look up plan details from the plan name (Stripe plans)
    const planDetails = getStripePrices().find((plan: StripePlan) => plan.name === org.planOverride);

    if (!planDetails) {
      console.error("Plan override not found in price list:", org.planOverride);
      return null;
    }

    return {
      source: "override",
      planName: planDetails.name,
      eventLimit: planDetails.limits.events,
      replayLimit: planDetails.limits.replays,
      periodStart: getStartOfMonth(),
      status: "active",
      interval: planDetails.interval,
      cancelAtPeriodEnd: false,
    };
  } catch (error) {
    console.error("Error checking plan override:", error);
    return null;
  }
}

/**
 * Short-lived in-process cache for Stripe subscription lookups, keyed by customer ID.
 *
 * Subscription data is read on hot paths (e.g. listing sites on every dashboard load)
 * but changes rarely, so caching it for a short window collapses repeated reads into a
 * single Stripe API call and keeps us well under Stripe's request rate limits. Each
 * worker process keeps its own cache; staleness is bounded by the TTL, and mutations
 * (plan changes, new checkouts) call invalidateStripeSubscriptionCache to refresh early.
 */
const STRIPE_SUBSCRIPTION_CACHE_TTL_MS = 60_000;
const stripeSubscriptionCache = new Map<string, { value: StripeSubscriptionInfo | null; expiresAt: number }>();

/**
 * Drops the cached subscription for a customer so the next read fetches fresh data.
 * Call this after any mutation that changes a customer's subscription.
 */
export function invalidateStripeSubscriptionCache(stripeCustomerId: string | null): void {
  if (stripeCustomerId) {
    stripeSubscriptionCache.delete(stripeCustomerId);
  }
  // Also drop the account-wide snapshot so admin/cron reads pick up the change promptly.
  allStripeSubscriptionsCache = null;
}

/**
 * Account-wide snapshot of the best subscription per customer.
 *
 * The admin endpoints and the usage cron both need subscriptions for many/all customers at
 * once. Instead of one Stripe request per customer, we pull every subscription on the account
 * in a handful of paginated requests (100/page) and group them — so call volume scales with the
 * number of subscriptions, not the number of customers or requests. Cached per process.
 */
const STRIPE_ALL_SUBSCRIPTIONS_TTL_MS = 5 * 60_000;
let allStripeSubscriptionsCache: { value: Map<string, Stripe.Subscription>; expiresAt: number } | null = null;
let allStripeSubscriptionsInflight: Promise<Map<string, Stripe.Subscription>> | null = null;

/** Clears the account-wide subscription snapshot. */
export function invalidateAllStripeSubscriptionsCache(): void {
  allStripeSubscriptionsCache = null;
}

/**
 * Ranks a subscription so the "best" one per customer wins when grouping: prefer
 * active/trialing, then the most recently created.
 */
function rankSubscription(subscription: Stripe.Subscription): number {
  const isActiveOrTrialing = subscription.status === "active" || subscription.status === "trialing";
  // `created` is a unix timestamp (~1.7e9); the status weight (×1e13) dominates so an
  // active/trialing sub always outranks a canceled one regardless of creation time.
  return (isActiveOrTrialing ? 1 : 0) * 1e13 + subscription.created;
}

/**
 * Returns the best (active/trialing preferred, else most recent) raw subscription per customer
 * across the whole Stripe account, pulled in bulk and cached. Throws if the bulk fetch fails so
 * callers can decide whether to preserve previous state rather than treat everyone as free.
 */
export async function getAllStripeSubscriptionsByCustomer(): Promise<Map<string, Stripe.Subscription>> {
  if (!stripe) {
    return new Map();
  }

  const cached = allStripeSubscriptionsCache;
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  // De-duplicate concurrent refreshes (e.g. several admin requests landing at once) so only
  // one bulk pagination runs at a time.
  if (allStripeSubscriptionsInflight) {
    return allStripeSubscriptionsInflight;
  }

  allStripeSubscriptionsInflight = (async () => {
    try {
      const byCustomer = new Map<string, Stripe.Subscription>();

      // The SDK auto-paginates this async iterator (100 subscriptions per underlying request).
      for await (const subscription of (stripe as Stripe).subscriptions.list({
        status: "all",
        limit: 100,
        expand: ["data.plan.product"],
      })) {
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
        const existing = byCustomer.get(customerId);
        if (!existing || rankSubscription(subscription) > rankSubscription(existing)) {
          byCustomer.set(customerId, subscription);
        }
      }

      allStripeSubscriptionsCache = {
        value: byCustomer,
        expiresAt: Date.now() + STRIPE_ALL_SUBSCRIPTIONS_TTL_MS,
      };
      return byCustomer;
    } finally {
      allStripeSubscriptionsInflight = null;
    }
  })();

  return allStripeSubscriptionsInflight;
}

/**
 * Resolves a customer's StripeSubscriptionInfo from a bulk snapshot, applying the same
 * active/trialing-only semantics as getStripeSubscription (canceled/past_due → no sub → free).
 */
export function stripeSubscriptionInfoFromSnapshot(
  snapshot: Map<string, Stripe.Subscription>,
  stripeCustomerId: string | null
): StripeSubscriptionInfo | null {
  if (!stripeCustomerId) {
    return null;
  }
  const subscription = snapshot.get(stripeCustomerId);
  if (!subscription || (subscription.status !== "active" && subscription.status !== "trialing")) {
    return null;
  }
  return buildStripeSubscriptionInfo(subscription);
}

/**
 * Gets Stripe subscription info for an organization
 * @returns Stripe subscription info or null if no active subscription found
 */
export async function getStripeSubscription(
  stripeCustomerId: string | null,
  { throwOnError = false }: { throwOnError?: boolean } = {}
): Promise<StripeSubscriptionInfo | null> {
  if (!stripeCustomerId) {
    return null;
  }

  const cached = stripeSubscriptionCache.get(stripeCustomerId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  try {
    const value = await fetchStripeSubscription(stripeCustomerId);
    stripeSubscriptionCache.set(stripeCustomerId, {
      value,
      expiresAt: Date.now() + STRIPE_SUBSCRIPTION_CACHE_TTL_MS,
    });
    return value;
  } catch (error) {
    console.error("Error fetching Stripe subscription:", error);
    // Prefer the last known value (even if expired) over treating the org as having
    // no subscription — that would silently downgrade a paying customer. A cached
    // `null` is also trustworthy: it means we previously confirmed there was no sub.
    if (cached) {
      return cached.value;
    }
    // No cached value at all, so we genuinely don't know this customer's status.
    // Callers that must not mistake a transient Stripe failure for "no subscription"
    // (e.g. the usage cron) opt into throwing so they can preserve the org's existing
    // state instead of downgrading it to free.
    if (throwOnError) {
      throw error;
    }
    return null;
  }
}

/**
 * Performs the actual Stripe API lookup for a customer's best subscription.
 * Uses a single list call (status "all") to halve request volume versus separate
 * active/trialing queries.
 */
async function fetchStripeSubscription(stripeCustomerId: string): Promise<StripeSubscriptionInfo | null> {
  // Fetch active + trialing in a single request and filter locally.
  const subs = await (stripe as Stripe).subscriptions.list({
    customer: stripeCustomerId,
    status: "all",
    limit: 100,
    expand: ["data.plan.product"],
  });

  const allSubs = subs.data.filter(sub => sub.status === "active" || sub.status === "trialing");

  if (allSubs.length === 0) {
    return null;
  }

  // Pick the most recently created subscription across both active and trialing
  const subscription = allSubs.sort((a, b) => b.created - a.created)[0];
  return buildStripeSubscriptionInfo(subscription);
}

/**
 * Builds our StripeSubscriptionInfo from a raw Stripe subscription. Pure — does not call Stripe —
 * so it is reused for both per-customer lookups and bulk account snapshots.
 */
function buildStripeSubscriptionInfo(subscription: Stripe.Subscription): StripeSubscriptionInfo | null {
  const isTrial = subscription.status === "trialing";

  const subscriptionItem = subscription.items.data[0];
  const priceId = subscriptionItem?.price.id;

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
      replayLimit: 0,
      periodStart: getStartOfMonth(),
      currentPeriodEnd: new Date(subscriptionItem.current_period_end * 1000),
      status: subscription.status,
      interval: subscriptionItem.price.recurring?.interval ?? "unknown",
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      createdAt: new Date(subscription.created * 1000),
      ...(isTrial && subscription.trial_end ? { trialEnd: new Date(subscription.trial_end * 1000) } : {}),
    };
  }

  // Determine period start
  const currentMonthStart = DateTime.now().startOf("month");
  const subscriptionStartDate = DateTime.fromSeconds(subscriptionItem.current_period_start);

  // If subscription started within current month, use that date; otherwise use month start
  const periodStart =
    subscriptionStartDate >= currentMonthStart ? (subscriptionStartDate.toISODate() as string) : getStartOfMonth();

  return {
    source: "stripe",
    subscriptionId: subscription.id,
    priceId,
    planName: planDetails.name,
    eventLimit: planDetails.limits.events,
    replayLimit: planDetails.limits.replays,
    periodStart,
    currentPeriodEnd: new Date(subscriptionItem.current_period_end * 1000),
    status: subscription.status,
    interval: subscriptionItem.price.recurring?.interval ?? "unknown",
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    createdAt: new Date(subscription.created * 1000),
    ...(isTrial && subscription.trial_end ? { trialEnd: new Date(subscription.trial_end * 1000) } : {}),
  };
}

/**
 * Gets custom plan subscription info for an organization
 * @returns Custom plan subscription info or null if no custom plan set
 */
export async function getCustomPlanSubscription(organizationId: string): Promise<CustomPlanSubscriptionInfo | null> {
  try {
    const orgResult = await db
      .select({ customPlan: organization.customPlan })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    const org = orgResult[0];
    if (!org?.customPlan) {
      return null;
    }

    const cp = org.customPlan;

    return {
      source: "custom",
      planName: "custom",
      eventLimit: cp.events,
      memberLimit: cp.members ?? null,
      siteLimit: cp.websites ?? null,
      periodStart: getStartOfMonth(),
      status: "active",
      interval: "lifetime",
      cancelAtPeriodEnd: false,
    };
  } catch (error) {
    console.error("Error checking custom plan:", error);
    return null;
  }
}

/**
 * Gets the best subscription for an organization
 * Priority: CustomPlan > Override > AppSumo/Stripe (highest limit) > Free
 * @returns The active subscription, or free tier if none found
 */
export async function getBestSubscription(
  organizationId: string,
  stripeCustomerId: string | null,
  { throwOnStripeError = false }: { throwOnStripeError?: boolean } = {}
): Promise<SubscriptionInfo> {
  // Check custom plan first - highest priority
  const customSub = await getCustomPlanSubscription(organizationId);
  if (customSub) {
    return customSub;
  }

  // Check override next
  const overrideSub = await getOverrideSubscription(organizationId);
  if (overrideSub) {
    return overrideSub;
  }

  // Get both subscription types
  const [appsumoSub, stripeSub] = await Promise.all([
    getAppSumoSubscription(organizationId),
    getStripeSubscription(stripeCustomerId, { throwOnError: throwOnStripeError }),
  ]);

  if (stripeSub) {
    return stripeSub;
  }

  if (appsumoSub) {
    return appsumoSub;
  }

  return freeSubscription();
}

/**
 * Like getBestSubscription, but uses an already-resolved Stripe subscription (e.g. from a bulk
 * account snapshot) instead of making a per-customer Stripe call. Used by callers that resolve
 * many orgs at once (admin endpoints, the usage cron).
 * Priority: CustomPlan > Override > Stripe > AppSumo > Free.
 */
export async function getBestSubscriptionFromStripeSub(
  organizationId: string,
  stripeSub: StripeSubscriptionInfo | null
): Promise<SubscriptionInfo> {
  const customSub = await getCustomPlanSubscription(organizationId);
  if (customSub) {
    return customSub;
  }

  const overrideSub = await getOverrideSubscription(organizationId);
  if (overrideSub) {
    return overrideSub;
  }

  if (stripeSub) {
    return stripeSub;
  }

  const appsumoSub = await getAppSumoSubscription(organizationId);
  if (appsumoSub) {
    return appsumoSub;
  }

  return freeSubscription();
}

/**
 * Whether a subscription's plan includes session replay.
 *
 * Replays are a Pro feature (see pricing page / PRO_FEATURES), plus AppSumo tiers
 * with a nonzero replay limit (4-6). This mirrors the client-side gate in
 * EnableSessionReplay/TrackingTab, including the exclusion of large (>=500k event)
 * trials. For Stripe plans the `limits.replays` numbers in const.ts are a volume
 * quota, not an entitlement — basic/standard plans carry them but do not include
 * the feature.
 */
export function subscriptionIncludesReplay(subscription: SubscriptionInfo): boolean {
  switch (subscription.source) {
    case "custom":
      // Bespoke enterprise plans include everything in Pro
      return true;
    case "override":
      // AppSumo tier overrides carry the tier's replay entitlement;
      // Stripe-plan overrides follow the same pro-only rule as real Stripe plans
      return subscription.planName.startsWith("appsumo")
        ? subscription.replayLimit > 0
        : subscription.planName.includes("pro");
    case "stripe": {
      const isLargeTrial = subscription.status === "trialing" && subscription.eventLimit >= 500_000;
      return subscription.planName.includes("pro") && !isLargeTrial;
    }
    case "appsumo":
      return subscription.replayLimit > 0;
    case "free":
      return false;
  }
}

/**
 * Monthly session replay quota for a subscription. Only meaningful when
 * subscriptionIncludesReplay is true; 0 otherwise.
 */
export function getReplayLimit(subscription: SubscriptionInfo): number {
  switch (subscription.source) {
    case "custom":
      // Bespoke enterprise plans have no replay cap
      return Infinity;
    case "stripe":
    case "override":
    case "appsumo":
      return subscription.replayLimit;
    case "free":
      return 0;
  }
}

function freeSubscription(): FreeSubscriptionInfo {
  return {
    source: "free",
    eventLimit: DEFAULT_EVENT_LIMIT,
    periodStart: getStartOfMonth(),
    planName: "free",
    status: "free",
  };
}
