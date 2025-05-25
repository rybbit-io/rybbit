import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import Stripe from "stripe";
import { db } from "../../db/postgres/postgres.js";
import { user as userSchema } from "../../db/postgres/schema.js";
import {
  DEFAULT_EVENT_LIMIT,
  getStripePrices,
  StripePlan,
} from "../../lib/const.js";
import { stripe } from "../../lib/stripe.js";
import { DateTime } from "luxon";

// Function to find plan details by price ID
function findPlanDetails(priceId: string): StripePlan | undefined {
  return getStripePrices().find(
    (plan: StripePlan) =>
      plan.priceId === priceId ||
      (plan.annualDiscountPriceId && plan.annualDiscountPriceId === priceId)
  );
}

function getStartOfMonth() {
  return DateTime.now().startOf("month").toJSDate();
}

function getStartOfNextMonth() {
  return DateTime.now().startOf("month").plus({ months: 1 }).toJSDate();
}

export async function getSubscriptionInner(userId: string) {
  // 1. Find the user and their Stripe Customer ID
  const userResult = await db
    .select({
      stripeCustomerId: userSchema.stripeCustomerId,
      monthlyEventCount: userSchema.monthlyEventCount,
      createdAt: userSchema.createdAt,
    })
    .from(userSchema)
    .where(eq(userSchema.id, userId))
    .limit(1);

  const user = userResult[0];

  if (!user) {
    return null;
  }

  // Check if user has an active Stripe subscription
  if (user.stripeCustomerId) {
    // 2. List active subscriptions for the customer from Stripe
    const subscriptions = await (stripe as Stripe).subscriptions.list({
      customer: user.stripeCustomerId,
      status: "active", // Only fetch active subscriptions
      limit: 1, // Users should only have one active subscription in this model
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
      const planDetails = findPlanDetails(priceId);

      if (!planDetails) {
        console.error("Plan details not found for price ID:", priceId);
        // Still return the basic subscription info even if local plan details missing
        return {
          id: subscription.id,
          planName: "Unknown Plan", // Indicate missing details
          status: subscription.status,
          currentPeriodStart: new Date(
            subscriptionItem.current_period_start * 1000
          ),
          currentPeriodEnd: new Date(
            subscriptionItem.current_period_end * 1000
          ),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          eventLimit: 0, // Unknown limit
          monthlyEventCount: user.monthlyEventCount,
          interval: subscriptionItem.price.recurring?.interval ?? "unknown",
        };
      }

      // 4. Format and return the subscription data
      const responseData = {
        id: subscription.id,
        planName: planDetails.name,
        status: subscription.status,
        currentPeriodStart: new Date(
          subscriptionItem.current_period_start * 1000
        ),
        currentPeriodEnd: new Date(subscriptionItem.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        eventLimit: planDetails.limits.events,
        monthlyEventCount: user.monthlyEventCount,
        interval: subscriptionItem.price.recurring?.interval ?? "unknown",
      };

      return responseData;
    }
  }

  // If we get here, the user has no active paid subscription
  // Check if they're in the trial period
  // const createdAt = new Date(user.createdAt);
  // const now = new Date();
  // const trialEndDate = new Date(createdAt);
  // trialEndDate.setDate(trialEndDate.getDate() + TRIAL_DURATION_DAYS);

  // const isInTrialPeriod = now < trialEndDate;

  // if (isInTrialPeriod) {
  //   // User is in trial period
  //   return {
  //     id: null,
  //     planName: "trial",
  //     status: "trialing",
  //     currentPeriodEnd: trialEndDate,
  //     currentPeriodStart: createdAt,
  //     eventLimit: TRIAL_EVENT_LIMIT,
  //     monthlyEventCount: user.monthlyEventCount,
  //     interval: "month",
  //     isTrial: true,
  //     trialDaysRemaining: Math.ceil(
  //       (trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  //     ),
  //   };
  // }

  return {
    id: null,
    planName: "free",
    status: "free",
    currentPeriodEnd: getStartOfNextMonth(),
    currentPeriodStart: getStartOfMonth(),
    eventLimit: DEFAULT_EVENT_LIMIT,
    monthlyEventCount: user.monthlyEventCount,
    trialDaysRemaining: 0,
  };
}

export async function getSubscription(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const userId = request.user?.id;

  if (!userId) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  try {
    const responseData = await getSubscriptionInner(userId);
    return reply.send(responseData);
  } catch (error: any) {
    console.error("Get Subscription Error:", error);
    // Handle specific Stripe errors if necessary
    if (error instanceof Stripe.errors.StripeError) {
      return reply
        .status(error.statusCode || 500)
        .send({ error: error.message });
    } else {
      return reply.status(500).send({
        error: "Failed to fetch subscription details",
        details: error.message,
      });
    }
  }
}
