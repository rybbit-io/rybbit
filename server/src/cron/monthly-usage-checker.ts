import { eq, inArray, isNotNull } from "drizzle-orm";
import { DateTime } from "luxon";
import Stripe from "stripe";
import { processResults } from "../api/analytics/utils.js";
import { clickhouse } from "../db/clickhouse/clickhouse.js";
import { db } from "../db/postgres/postgres.js";
import { organization, sites } from "../db/postgres/schema.js";
import {
  getStripePrices,
  StripePlan,
  DEFAULT_EVENT_LIMIT,
} from "../lib/const.js";
import { stripe } from "../lib/stripe.js";

// Global set to track site IDs that have exceeded their monthly limits
export const sitesOverLimit = new Set<number>();

/**
 * Gets the first day of the current month in YYYY-MM-DD format using Luxon
 */
function getStartOfMonth(): string {
  return DateTime.now().startOf("month").toISODate() as string;
}

/**
 * Gets all site IDs for an organization
 */
async function getSiteIdsForOrganization(
  organizationId: string
): Promise<number[]> {
  try {
    const siteRecords = await db
      .select({ siteId: sites.siteId })
      .from(sites)
      .where(eq(sites.organizationId, organizationId));

    return siteRecords.map((record) => record.siteId);
  } catch (error) {
    console.error(
      `Error getting sites for organization ${organizationId}:`,
      error
    );
    return [];
  }
}

/**
 * Gets event limit and billing period start date for an organization based on their Stripe subscription.
 * Fetches directly from Stripe if the organization has a stripeCustomerId.
 * @returns [eventLimit, periodStartDate]
 */
async function getOrganizationSubscriptionInfo(orgData: {
  id: string;
  stripeCustomerId: string | null;
  createdAt: string;
  name: string;
}): Promise<[number, string | null]> {
  if (orgData.name === "Zam") {
    return [2_000_000, getStartOfMonth()];
  }

  if (!orgData.stripeCustomerId) {
    // No Stripe customer ID, use default limit and start of current month
    return [DEFAULT_EVENT_LIMIT, getStartOfMonth()];
  }

  try {
    // Fetch active subscriptions for the customer from Stripe
    const subscriptions = await (stripe as Stripe).subscriptions.list({
      customer: orgData.stripeCustomerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return [DEFAULT_EVENT_LIMIT, getStartOfMonth()];
    }

    const subscription = subscriptions.data[0];
    const subscriptionItem = subscription.items.data[0];

    const priceId = subscriptionItem.price.id;

    if (!priceId) {
      console.error(
        `Subscription item price ID not found for organization ${orgData.id}, sub ${subscription.id}`
      );
      return [DEFAULT_EVENT_LIMIT, getStartOfMonth()];
    }

    // Find corresponding plan details from constants
    const planDetails = getStripePrices().find(
      (plan: StripePlan) =>
        plan.priceId === priceId ||
        (plan.annualDiscountPriceId && plan.annualDiscountPriceId === priceId)
    );

    // Get the event limit from the plan
    const eventLimit = planDetails
      ? planDetails.limits.events // This is already the monthly event limit, regardless of billing interval
      : DEFAULT_EVENT_LIMIT;

    // For the period start, we need to handle several cases:
    const currentMonthStart = getStartOfMonth();
    let periodStart = currentMonthStart;

    if (subscriptionItem.current_period_start) {
      // Convert subscription start timestamp to DateTime
      const subscriptionStartDate = DateTime.fromSeconds(
        subscriptionItem.current_period_start
      );
      const currentMonth = DateTime.now().startOf("month");

      // If the subscription started within the current month, use that as the start date
      // This ensures we don't count events from before they subscribed (e.g., during their free trial)
      if (subscriptionStartDate >= currentMonth) {
        periodStart = subscriptionStartDate.toISODate() as string;
        console.log(
          `[Monthly Usage Checker] Organization ${orgData.name} subscribed during current month on ${periodStart}. Using subscription start date for counting.`
        );
      } else {
        console.log(
          `[Monthly Usage Checker] Organization ${orgData.name} subscription started before current month. Using month start for counting.`
        );
      }
    }

    // Include subscription info for logging purposes
    const interval = subscriptionItem.price.recurring?.interval || "unknown";
    console.log(
      `[Monthly Usage Checker] Organization ${orgData.name} has a ${interval} subscription.`
    );

    return [eventLimit, periodStart];
  } catch (error: any) {
    console.error(
      `Error fetching Stripe subscription info for organization ${orgData.name}:`,
      error
    );
    // Fallback to default limit and current month start on Stripe API error
    return [DEFAULT_EVENT_LIMIT, getStartOfMonth()];
  }
}

/**
 * Gets monthly pageview count from ClickHouse for the given site IDs
 */
async function getMonthlyPageviews(
  siteIds: number[],
  startDate: string | null
): Promise<number> {
  if (!siteIds.length) {
    return 0;
  }

  // If no startDate is provided (e.g., no subscription), default to start of month
  const periodStart = startDate || getStartOfMonth();

  try {
    const result = await clickhouse.query({
      query: `
        SELECT COUNT(*) as count
        FROM events
        WHERE site_id IN (${siteIds.join(",")})
        AND timestamp >= toDate('${periodStart}')
      `,
      format: "JSONEachRow",
    });
    const rows = await processResults<{ count: string }>(result);
    return parseInt(rows[0].count, 10);
  } catch (error) {
    console.error(
      `Error querying ClickHouse for pageviews for sites ${siteIds}:`,
      error
    );
    return 0;
  }
}

/**
 * Updates monthly event usage for all organizations
 */
export async function updateUsersMonthlyUsage() {
  console.log(
    "[Monthly Usage Checker] Starting check of monthly event usage for organizations..."
  );

  try {
    // Get all organizations (both with and without Stripe customer IDs)
    const organizations = await db
      .select({
        id: organization.id,
        name: organization.name,
        stripeCustomerId: organization.stripeCustomerId,
        createdAt: organization.createdAt,
      })
      .from(organization);

    for (const orgData of organizations) {
      try {
        // Get site IDs for this organization
        const siteIds = await getSiteIdsForOrganization(orgData.id);

        // If organization has no sites, continue to next organization
        if (!siteIds.length) {
          continue;
        }

        // Get organization's subscription information (limit and period start)
        const [eventLimit, periodStart] =
          await getOrganizationSubscriptionInfo(orgData);

        // Get monthly pageview count from ClickHouse using the billing period start date
        const pageviewCount = await getMonthlyPageviews(siteIds, periodStart);

        // Check if over limit and update global set
        const isOverLimit = pageviewCount > eventLimit;

        // Update organization's monthlyEventCount and overMonthlyLimit fields
        await db
          .update(organization)
          .set({
            monthlyEventCount: pageviewCount,
            overMonthlyLimit: isOverLimit,
          })
          .where(eq(organization.id, orgData.id));

        // If over the limit, add all this organization's sites to the global set
        if (isOverLimit) {
          for (const siteId of siteIds) {
            sitesOverLimit.add(siteId);
          }
          console.log(
            `[Monthly Usage Checker] Organization ${orgData.name} is over limit. Added ${siteIds.length} sites to blocked list.`
          );
        } else {
          for (const siteId of siteIds) {
            sitesOverLimit.delete(siteId);
          }
        }

        // Format additional date info for logging if available
        const periodInfo = periodStart
          ? `period started ${periodStart}`
          : "this month";

        console.log(
          `[Monthly Usage Checker] Updated organization ${
            orgData.name
          }: ${pageviewCount.toLocaleString()} events, limit ${eventLimit.toLocaleString()}, ${periodInfo}`
        );
      } catch (error) {
        console.error(
          `[Monthly Usage Checker] Error processing organization ${orgData.id}:`,
          error
        );
      }
    }

    console.log(
      `[Monthly Usage Checker] Completed monthly event usage check. ${sitesOverLimit.size} sites are over their limit.`
    );
  } catch (error) {
    console.error(
      "[Monthly Usage Checker] Error updating monthly usage:",
      error
    );
  }
}
