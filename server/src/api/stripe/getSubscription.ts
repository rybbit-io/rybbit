import { eq, and } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { DateTime } from "luxon";
import Stripe from "stripe";
import { db } from "../../db/postgres/postgres.js";
import { organization, member } from "../../db/postgres/schema.js";
import {
  APPSUMO_MEMBER_LIMITS,
  APPSUMO_SITE_LIMITS,
  BASIC_MEMBER_LIMIT,
  BASIC_SITE_LIMIT,
  FREE_MEMBER_LIMIT,
  FREE_SITE_LIMIT,
  STANDARD_MEMBER_LIMIT,
  STANDARD_SITE_LIMIT,
} from "../../lib/const.js";
import { getBestSubscription, SubscriptionInfo } from "../../lib/subscriptionUtils.js";

function getStartOfMonth() {
  return DateTime.now().startOf("month").toJSDate();
}

function getStartOfNextMonth() {
  return DateTime.now().startOf("month").plus({ months: 1 }).toJSDate();
}

/**
 * Computes memberLimit and siteLimit from a subscription.
 * null = unlimited.
 */
function computeLimits(
  subscription: SubscriptionInfo,
  stripeCreatedAt?: Date
): { memberLimit: number | null; siteLimit: number | null } {
  if (subscription.source === "custom") {
    return {
      memberLimit: subscription.memberLimit,
      siteLimit: subscription.siteLimit,
    };
  }

  const planName = subscription.planName;

  if (planName.includes("pro")) {
    return { memberLimit: null, siteLimit: null };
  }

  if (planName.includes("standard")) {
    // Legacy standard plans created before 2025-06-27 get unlimited sites
    const siteLimit =
      stripeCreatedAt && DateTime.fromJSDate(stripeCreatedAt) < DateTime.fromFormat("2025-06-27", "yyyy-MM-dd")
        ? null
        : STANDARD_SITE_LIMIT;
    return { memberLimit: STANDARD_MEMBER_LIMIT, siteLimit };
  }

  if (planName.includes("basic")) {
    return { memberLimit: BASIC_MEMBER_LIMIT, siteLimit: BASIC_SITE_LIMIT };
  }

  // AppSumo tiers (e.g. "appsumo-1" through "appsumo-6")
  const appsumoMatch = planName.match(/^appsumo-([123456])$/);
  if (appsumoMatch) {
    const tier = appsumoMatch[1];
    return {
      memberLimit: APPSUMO_MEMBER_LIMITS[tier] ?? null,
      siteLimit: APPSUMO_SITE_LIMITS[tier] ?? null,
    };
  }

  if (subscription.source === "override") {
    // Override with a known stripe plan name already handled above.
    // For unknown override plans, default to unlimited.
    return { memberLimit: null, siteLimit: null };
  }

  // Free tier
  return { memberLimit: FREE_MEMBER_LIMIT, siteLimit: FREE_SITE_LIMIT };
}

export async function getSubscriptionInner(organizationId: string) {
  // 1. Find the organization and their Stripe Customer ID
  const orgResult = await db
    .select({
      stripeCustomerId: organization.stripeCustomerId,
      monthlyEventCount: organization.monthlyEventCount,
      createdAt: organization.createdAt,
      name: organization.name,
    })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  const org = orgResult[0];

  if (!org) {
    return null;
  }

  // Get the best subscription (highest event limit from AppSumo or Stripe)
  const subscription = await getBestSubscription(organizationId, org.stripeCustomerId);

  // Compute member/site limits
  const stripeCreatedAt = subscription.source === "stripe" ? subscription.createdAt : undefined;
  const limits = computeLimits(subscription, stripeCreatedAt);

  // Format response based on subscription source
  if (subscription.source === "custom") {
    return {
      id: null,
      planName: subscription.planName,
      status: subscription.status,
      currentPeriodEnd: getStartOfNextMonth(),
      currentPeriodStart: getStartOfMonth(),
      eventLimit: subscription.eventLimit,
      monthlyEventCount: org.monthlyEventCount || 0,
      interval: subscription.interval,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      ...limits,
    };
  }

  if (subscription.source === "override") {
    return {
      id: null,
      planName: subscription.planName,
      status: subscription.status,
      currentPeriodEnd: getStartOfNextMonth(),
      currentPeriodStart: getStartOfMonth(),
      eventLimit: subscription.eventLimit,
      monthlyEventCount: org.monthlyEventCount || 0,
      interval: subscription.interval,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      isOverride: true,
      ...limits,
    };
  }

  if (subscription.source === "appsumo") {
    return {
      id: null,
      planName: subscription.planName,
      status: subscription.status,
      currentPeriodEnd: getStartOfNextMonth(),
      currentPeriodStart: getStartOfMonth(),
      eventLimit: subscription.eventLimit,
      monthlyEventCount: org.monthlyEventCount || 0,
      interval: subscription.interval,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      ...limits,
    };
  }

  if (subscription.source === "stripe") {
    if (subscription.status === "trialing") {
      const trialDaysRemaining = subscription.trialEnd
        ? Math.max(0, Math.ceil(DateTime.fromJSDate(subscription.trialEnd).diff(DateTime.now(), "days").days))
        : 0;
      return {
        id: subscription.subscriptionId,
        planName: subscription.planName,
        status: subscription.status,
        createdAt: subscription.createdAt,
        currentPeriodStart: DateTime.fromISO(subscription.periodStart).toJSDate(),
        currentPeriodEnd: subscription.trialEnd ?? subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        eventLimit: subscription.eventLimit,
        monthlyEventCount: org.monthlyEventCount || 0,
        interval: subscription.interval,
        isTrial: true,
        trialDaysRemaining,
        ...limits,
      };
    }
    return {
      id: subscription.subscriptionId,
      planName: subscription.planName,
      status: subscription.status,
      createdAt: subscription.createdAt,
      currentPeriodStart: DateTime.fromISO(subscription.periodStart).toJSDate(),
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      eventLimit: subscription.eventLimit,
      monthlyEventCount: org.monthlyEventCount || 0,
      interval: subscription.interval,
      ...limits,
    };
  }

  // Free tier
  return {
    id: null,
    planName: subscription.planName,
    status: subscription.status,
    currentPeriodEnd: getStartOfNextMonth(),
    currentPeriodStart: getStartOfMonth(),
    eventLimit: subscription.eventLimit,
    monthlyEventCount: org.monthlyEventCount || 0,
    trialDaysRemaining: 0,
    ...limits,
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

  // Verify user is a member of this organization
  const memberResult = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
    .limit(1);

  if (!memberResult.length) {
    return reply.status(403).send({ error: "You do not have access to this organization" });
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
