import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { DateTime } from "luxon";
import Stripe from "stripe";
import { db } from "../../db/postgres/postgres.js";
import { organization } from "../../db/postgres/schema.js";
import { DEFAULT_EVENT_LIMIT, getStripePrices } from "../../lib/const.js";
import { stripe } from "../../lib/stripe.js";

function getStartOfMonth() {
  return DateTime.now().startOf("month").toJSDate();
}

function getStartOfNextMonth() {
  return DateTime.now().startOf("month").plus({ months: 1 }).toJSDate();
}

export async function getSubscriptionInner(organizationId: string) {
  // 1. Find the organization and their Stripe Customer ID
  const orgResult = await db
    .select({
      stripeCustomerId: organization.stripeCustomerId,
      monthlyEventCount: organization.monthlyEventCount,
      createdAt: organization.createdAt,
    })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  const org = orgResult[0];

  if (!org) {
    return null;
  }

  // Check if organization has an active Stripe subscription
  if (org.stripeCustomerId) {
    // 2. List active subscriptions for the customer from Stripe
    const subscriptions = await (stripe as Stripe).subscriptions.list({
      customer: org.stripeCustomerId,
      status: "active", // Only fetch active subscriptions
      limit: 1, // Organizations should only have one active subscription
      expand: ["data.plan.product"], // Expand to get product details if needed
    });

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      const subscriptionItem = subscription.items.data[0];

      const priceId = subscriptionItem.price.id;

      if (!priceId) {
        throw new Error("Subscription item price ID not found");
      }

      // 3. Find corresponding plan details from your constants
      const planDetails = getStripePrices().find(plan => plan.priceId === priceId);

      if (!planDetails) {
        console.error("Plan details not found for price ID:", priceId);
        // Still return the basic subscription info even if local plan details missing
        return {
          id: subscription.id,
          planName: "Unknown Plan", // Indicate missing details
          status: subscription.status,
          createdAt: new Date(subscription.created * 1000),
          currentPeriodStart: new Date(subscriptionItem.current_period_start * 1000),
          currentPeriodEnd: new Date(subscriptionItem.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          eventLimit: 0, // Unknown limit
          monthlyEventCount: org.monthlyEventCount || 0,
          interval: subscriptionItem.price.recurring?.interval ?? "unknown",
        };
      }

      // 4. Format and return the subscription data
      const responseData = {
        id: subscription.id,
        planName: planDetails.name,
        isPro: planDetails.name.includes("pro"),
        status: subscription.status,
        createdAt: new Date(subscription.created * 1000),
        currentPeriodStart: new Date(subscriptionItem.current_period_start * 1000),
        currentPeriodEnd: new Date(subscriptionItem.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        eventLimit: planDetails.limits.events,
        monthlyEventCount: org.monthlyEventCount || 0,
        interval: subscriptionItem.price.recurring?.interval ?? "unknown",
      };

      return responseData;
    }
  }

  // If we get here, the organization has no active paid subscription
  return {
    id: null,
    planName: "free",
    status: "free",
    currentPeriodEnd: getStartOfNextMonth(),
    currentPeriodStart: getStartOfMonth(),
    eventLimit: DEFAULT_EVENT_LIMIT,
    monthlyEventCount: org.monthlyEventCount || 0,
    trialDaysRemaining: 0,
  };
}

export async function getSubscription(
  request: FastifyRequest<{
    Querystring: {
      organizationId: string;
    };
  }>,
  reply: FastifyReply
) {
  const userId = request.user?.id;
  const { organizationId } = request.query;

  if (!userId) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  if (!organizationId) {
    return reply.status(400).send({ error: "Organization ID is required" });
  }

  try {
    const responseData = await getSubscriptionInner(organizationId);
    return reply.send(responseData);
  } catch (error: any) {
    console.error("Get Subscription Error:", error);
    // Handle specific Stripe errors if necessary
    if (error instanceof Stripe.errors.StripeError) {
      return reply.status(error.statusCode || 500).send({ error: error.message });
    } else {
      return reply.status(500).send({
        error: "Failed to fetch subscription details",
        details: error.message,
      });
    }
  }
}
