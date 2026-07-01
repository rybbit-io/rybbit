import { sql } from "drizzle-orm";
import { DateTime } from "luxon";
import Stripe from "stripe";
import { db } from "../../db/postgres/postgres.js";
import { APPSUMO_TIER_LIMITS, DEFAULT_EVENT_LIMIT, getStripePrices } from "../../lib/const.js";
import { stripe } from "../../lib/stripe.js";
import { getAllStripeSubscriptionsByCustomer } from "../../lib/subscriptionUtils.js";

export interface SubscriptionData {
  id: string;
  planName: string;
  status: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  eventLimit?: number;
  interval?: string;
}

/**
 * Projects a raw Stripe subscription into the admin SubscriptionData shape. Unlike the app-facing
 * lookup, the admin view keeps non-active subscriptions (canceled/past_due) so it can display them.
 */
function buildAdminSubscriptionData(
  subscription: Stripe.Subscription,
  includeFullDetails: boolean
): SubscriptionData | null {
  const subscriptionItem = subscription.items.data[0];
  const priceId = subscriptionItem?.price.id;

  if (!priceId) {
    return null;
  }

  const planDetails = getStripePrices().find(plan => plan.priceId === priceId);

  const data: SubscriptionData = {
    id: subscription.id,
    planName: planDetails?.name || "Unknown Plan",
    status: subscription.status,
  };

  if (includeFullDetails) {
    data.currentPeriodStart = new Date(subscriptionItem.current_period_start * 1000);
    data.currentPeriodEnd = new Date(subscriptionItem.current_period_end * 1000);
    data.cancelAtPeriodEnd = subscription.cancel_at_period_end;
    data.eventLimit = planDetails?.limits.events || 0;
    data.interval = subscriptionItem.price.recurring?.interval ?? "unknown";
  }

  return data;
}

/**
 * Fetches subscription data for multiple Stripe customer IDs.
 *
 * Rather than one Stripe request per customer, this reads from a single cached account-wide
 * snapshot (a handful of paginated requests for the whole account) and picks out the customers
 * we care about — so admin loads don't scale Stripe calls with the customer count or refetch rate.
 * @param stripeCustomerIds Set of Stripe customer IDs to fetch subscriptions for
 * @param includeFullDetails Whether to include full subscription details (periods, limits, etc.)
 * @returns Map of customer ID to subscription data
 */
async function fetchSubscriptionsForCustomers(
  stripeCustomerIds: Set<string>,
  includeFullDetails = false
): Promise<Map<string, SubscriptionData>> {
  const subscriptionMap = new Map<string, SubscriptionData>();

  if (!stripe || stripeCustomerIds.size === 0) {
    return subscriptionMap;
  }

  let snapshot: Map<string, Stripe.Subscription>;
  try {
    snapshot = await getAllStripeSubscriptionsByCustomer();
  } catch (error) {
    // Bulk fetch failed (e.g. rate limit) — render orgs as free for this load rather than
    // failing the whole admin page. The next load retries once the snapshot can refresh.
    console.error("Error fetching Stripe subscriptions in bulk:", error);
    return subscriptionMap;
  }

  for (const customerId of stripeCustomerIds) {
    const subscription = snapshot.get(customerId);
    if (!subscription) {
      continue;
    }
    const value = buildAdminSubscriptionData(subscription, includeFullDetails);
    if (value) {
      subscriptionMap.set(customerId, value);
    }
  }

  return subscriptionMap;
}

interface AppSumoLicenseData {
  tier: string;
  eventLimit: number;
}

/**
 * Fetches AppSumo license data for multiple organization IDs
 * @param organizationIds Set of organization IDs to fetch AppSumo licenses for
 * @returns Map of organization ID to AppSumo license data
 */
async function fetchAppSumoLicensesForOrganizations(
  organizationIds: Set<string>
): Promise<Map<string, AppSumoLicenseData>> {
  const licenseMap = new Map<string, AppSumoLicenseData>();

  if (organizationIds.size === 0) {
    return licenseMap;
  }

  try {
    const orgIdsArray = Array.from(organizationIds);
    const BATCH_SIZE = 1000;

    // Batch queries to avoid PostgreSQL's row expression limit
    for (let i = 0; i < orgIdsArray.length; i += BATCH_SIZE) {
      const batch = orgIdsArray.slice(i, i + BATCH_SIZE);
      const placeholders = sql.join(
        batch.map(id => sql`${id}`),
        sql`, `
      );
      const licenses = await db.execute(
        sql`SELECT organization_id, tier FROM appsumo.licenses WHERE organization_id IN (${placeholders}) AND status = 'active'`
      );

      if (Array.isArray(licenses)) {
        for (const license of licenses) {
          const orgId = (license as any).organization_id as string;
          const tier = (license as any).tier as keyof typeof APPSUMO_TIER_LIMITS;
          const eventLimit = APPSUMO_TIER_LIMITS[tier] || APPSUMO_TIER_LIMITS["1"];

          licenseMap.set(orgId, { tier, eventLimit });
        }
      }
    }
  } catch (error) {
    console.error("Error fetching AppSumo licenses:", error);
  }

  return licenseMap;
}

/**
 * Creates a map of organization IDs to their subscription data
 * @param organizations Array of organization objects with id and stripeCustomerId
 * @param includeFullDetails Whether to include full subscription details
 * @returns Map of organization ID to subscription data with fallback to free plan
 */
export async function getOrganizationSubscriptions(
  organizations: Array<{ id: string; stripeCustomerId?: string | null }>,
  includeFullDetails = false
): Promise<
  Map<string, SubscriptionData & { planName: string; status: string; eventLimit: number; currentPeriodEnd: Date }>
> {
  const orgsWithStripe = organizations.filter(org => org.stripeCustomerId);
  const stripeCustomerIds = new Set(orgsWithStripe.map(org => org.stripeCustomerId!));
  const allOrgIds = new Set(organizations.map(org => org.id));

  // Fetch both Stripe subscriptions and AppSumo licenses in parallel
  const [stripeSubscriptionMap, appsumoLicenseMap] = await Promise.all([
    fetchSubscriptionsForCustomers(stripeCustomerIds, includeFullDetails),
    fetchAppSumoLicensesForOrganizations(allOrgIds),
  ]);

  // Create organization map with subscription data
  const orgSubscriptionMap = new Map<
    string,
    SubscriptionData & { planName: string; status: string; eventLimit: number; currentPeriodEnd: Date }
  >();

  const nextMonthStart = DateTime.now().startOf("month").plus({ months: 1 }).toJSDate();

  for (const org of organizations) {
    const stripeData = org.stripeCustomerId ? stripeSubscriptionMap.get(org.stripeCustomerId) : null;
    const appsumoData = appsumoLicenseMap.get(org.id);

    // Determine which subscription to use (highest event limit wins)
    const stripeEventLimit = stripeData?.eventLimit ?? 0;
    const appsumoEventLimit = appsumoData?.eventLimit ?? 0;

    if (stripeData && (!appsumoData || stripeEventLimit >= appsumoEventLimit)) {
      // Use Stripe subscription
      orgSubscriptionMap.set(org.id, {
        ...stripeData,
        planName: stripeData.planName || "free",
        status: stripeData.status || "free",
        eventLimit: stripeData.eventLimit ?? 0,
        currentPeriodEnd: stripeData.currentPeriodEnd ?? new Date(),
      });
    } else if (appsumoData) {
      // Use AppSumo subscription
      const subscriptionData: SubscriptionData & {
        planName: string;
        status: string;
        eventLimit: number;
        currentPeriodEnd: Date;
      } = {
        id: "",
        planName: `appsumo-${appsumoData.tier}`,
        status: "active",
        eventLimit: appsumoData.eventLimit,
        currentPeriodEnd: nextMonthStart,
      };

      if (includeFullDetails) {
        subscriptionData.currentPeriodStart = DateTime.now().startOf("month").toJSDate();
        subscriptionData.cancelAtPeriodEnd = false;
        subscriptionData.interval = "lifetime";
      }

      orgSubscriptionMap.set(org.id, subscriptionData);
    } else {
      // Free plan with all required fields
      orgSubscriptionMap.set(org.id, {
        id: "",
        planName: "free",
        status: "free",
        eventLimit: DEFAULT_EVENT_LIMIT,
        currentPeriodEnd: nextMonthStart,
      });
    }
  }

  return orgSubscriptionMap;
}
