import { eq, inArray } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { DateTime } from "luxon";
import clickhouse from "../../db/clickhouse/clickhouse.js";
import { db } from "../../db/postgres/postgres.js";
import { member, sites, user } from "../../db/postgres/schema.js";
import { getIsUserAdmin } from "../../lib/auth-utils.js";
import {
  DEFAULT_EVENT_LIMIT,
  getStripePrices,
  StripePlan,
} from "../../lib/const.js";
import { stripe } from "../../lib/stripe.js";

// Define event count result type
interface EventCountResult {
  site_id: string;
  total_events: number;
}

// Function to find plan details by price ID
function findPlanDetails(priceId: string): StripePlan | undefined {
  return getStripePrices().find(
    (plan: StripePlan) =>
      plan.priceId === priceId ||
      (plan.annualDiscountPriceId && plan.annualDiscountPriceId === priceId)
  );
}

function getStartOfNextMonth() {
  return DateTime.now().startOf("month").plus({ months: 1 }).toJSDate();
}

export interface AdminOrganizationData {
  id: string;
  name: string;
  createdAt: string;
  monthlyEventCount: number;
  overMonthlyLimit: boolean;
  subscription: {
    id: string | null;
    planName: string;
    status: string;
    eventLimit: number;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd?: boolean;
    interval?: string;
  };
  sites: {
    siteId: number;
    name: string;
    domains: string[];
    createdAt: string;
    eventsLast24Hours: number;
  }[];
  members: {
    userId: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  }[];
}

export async function getAdminOrganizations(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const isAdmin = await getIsUserAdmin(request);

  if (!isAdmin) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  try {
    // Get all organizations with their basic data
    const organizationsData = await db.query.organization.findMany({
      orderBy: (organization, { desc }) => [
        desc(organization.monthlyEventCount),
      ],
    });

    // Get all members for all organizations
    const allMembers = await db
      .select({
        organizationId: member.organizationId,
        userId: member.userId,
        role: member.role,
        createdAt: member.createdAt,
        userName: user.name,
        userEmail: user.email,
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id));

    // Create map of organization IDs to their members
    const orgMembersMap = new Map<string, any[]>();
    for (const memberData of allMembers) {
      if (!orgMembersMap.has(memberData.organizationId)) {
        orgMembersMap.set(memberData.organizationId, []);
      }
      orgMembersMap.get(memberData.organizationId)?.push({
        userId: memberData.userId,
        name: memberData.userName,
        email: memberData.userEmail,
        role: memberData.role,
        createdAt: memberData.createdAt,
      });
    }

    // Get all sites for all organizations
    const allOrgIds = organizationsData.map((org) => org.id);
    const orgSites = await db
      .select({
        siteId: sites.siteId,
        name: sites.name,
        domains: sites.domains,
        createdAt: sites.createdAt,
        organizationId: sites.organizationId,
      })
      .from(sites)
      .where(
        allOrgIds.length > 0
          ? inArray(sites.organizationId, allOrgIds)
          : undefined
      );

    // Get event counts for the past 24 hours from ClickHouse
    const now = DateTime.now();
    const yesterday = now.minus({ hours: 24 });

    let siteEventMap = new Map<number, number>();

    try {
      const eventCountsResult = await clickhouse.query({
        query: `
          SELECT 
            site_id,
            sum(event_count) as total_events
          FROM 
            hourly_events_by_site_mv_target
          WHERE 
            event_hour >= toDateTime('${yesterday.toFormat("yyyy-MM-dd HH:mm:ss")}') AND
            event_hour <= toDateTime('${now.toFormat("yyyy-MM-dd HH:mm:ss")}')
          GROUP BY 
            site_id
        `,
        format: "JSONEachRow",
      });

      const rawEventCounts = await eventCountsResult.json();
      const eventCounts = rawEventCounts as EventCountResult[];

      for (const event of eventCounts) {
        siteEventMap.set(Number(event.site_id), event.total_events);
      }
    } catch (clickhouseError) {
      console.warn(
        "ClickHouse query failed, continuing without event counts:",
        clickhouseError
      );
    }

    // Create map of organization IDs to their sites with event counts
    const orgSitesMap = new Map<string, any[]>();
    for (const site of orgSites) {
      if (site.organizationId) {
        if (!orgSitesMap.has(site.organizationId)) {
          orgSitesMap.set(site.organizationId, []);
        }
        orgSitesMap.get(site.organizationId)?.push({
          siteId: site.siteId,
          name: site.name,
          domains: site.domains,
          createdAt: site.createdAt,
          eventsLast24Hours: siteEventMap.get(site.siteId) || 0,
        });
      }
    }

    // Get subscription data for organizations with Stripe customer IDs
    const orgsWithStripe = organizationsData.filter(
      (org) => org.stripeCustomerId
    );
    const stripeCustomerIds = new Set(
      orgsWithStripe.map((org) => org.stripeCustomerId!)
    );

    // Use bulk fetch approach: get all active subscriptions and filter by customer IDs
    const subscriptionMap = new Map<string, any>();

    if (stripe && stripeCustomerIds.size > 0) {
      try {
        // Fetch all active subscriptions in batches using pagination
        let hasMore = true;
        let startingAfter: string | undefined;

        while (hasMore) {
          const subscriptions = await stripe.subscriptions.list({
            status: "active",
            limit: 100, // Maximum allowed by Stripe
            expand: ["data.plan.product"],
            ...(startingAfter && { starting_after: startingAfter }),
          });

          // Process subscriptions for our customers
          for (const subscription of subscriptions.data) {
            const customerId = subscription.customer as string;

            if (stripeCustomerIds.has(customerId)) {
              const subscriptionItem = subscription.items.data[0];
              const priceId = subscriptionItem.price.id;

              if (priceId) {
                const planDetails = findPlanDetails(priceId);

                subscriptionMap.set(customerId, {
                  id: subscription.id,
                  planName: planDetails?.name || "Unknown Plan",
                  status: subscription.status,
                  currentPeriodStart: new Date(
                    subscriptionItem.current_period_start * 1000
                  ),
                  currentPeriodEnd: new Date(
                    subscriptionItem.current_period_end * 1000
                  ),
                  cancelAtPeriodEnd: subscription.cancel_at_period_end,
                  eventLimit: planDetails?.limits.events || 0,
                  interval:
                    subscriptionItem.price.recurring?.interval ?? "unknown",
                });
              }
            }
          }

          hasMore = subscriptions.has_more;
          if (hasMore && subscriptions.data.length > 0) {
            startingAfter =
              subscriptions.data[subscriptions.data.length - 1].id;
          }

          // Rate limiting: wait 50ms between requests (20 req/s)
          if (hasMore) {
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        }
      } catch (error) {
        console.error("Error fetching subscriptions from Stripe:", error);
      }
    }

    // Build the final response with subscription data
    const enrichedOrganizations: AdminOrganizationData[] =
      organizationsData.map((org) => {
        const subscriptionData = org.stripeCustomerId
          ? subscriptionMap.get(org.stripeCustomerId)
          : null;

        return {
          id: org.id,
          name: org.name,
          createdAt: org.createdAt,
          monthlyEventCount: org.monthlyEventCount || 0,
          overMonthlyLimit: org.overMonthlyLimit || false,
          subscription: subscriptionData || {
            id: null,
            planName: "free",
            status: "free",
            eventLimit: DEFAULT_EVENT_LIMIT,
            currentPeriodEnd: getStartOfNextMonth(),
          },
          sites: orgSitesMap.get(org.id) || [],
          members: orgMembersMap.get(org.id) || [],
        };
      });

    return reply.status(200).send(enrichedOrganizations);
  } catch (error) {
    console.error("Get Admin Organizations Error:", error);
    return reply.status(500).send({
      error: "Failed to fetch organizations data",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
