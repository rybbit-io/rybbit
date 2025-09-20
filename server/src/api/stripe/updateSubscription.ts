import { FastifyReply, FastifyRequest } from "fastify";
import { stripe } from "../../lib/stripe.js";
import { db } from "../../db/postgres/postgres.js";
import { organization, member } from "../../db/postgres/schema.js";
import { eq, and } from "drizzle-orm";
import Stripe from "stripe";

interface UpdateSubscriptionBody {
  organizationId: string;
  newPriceId: string;
}

export async function updateSubscription(
  request: FastifyRequest<{ Body: UpdateSubscriptionBody }>,
  reply: FastifyReply
) {
  const { organizationId, newPriceId } = request.body;
  const userId = request.user?.id;

  if (!userId) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  if (!organizationId || !newPriceId) {
    return reply.status(400).send({
      error: "Missing required parameters: organizationId, newPriceId",
    });
  }

  try {
    // 1. Verify user has permission to manage billing for this organization
    const memberResult = await db
      .select({
        role: member.role,
      })
      .from(member)
      .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
      .limit(1);

    if (!memberResult.length || memberResult[0].role !== "owner") {
      return reply.status(403).send({
        error: "Only organization owners can manage billing",
      });
    }

    // 2. Find the organization and its Stripe customer ID
    const orgResult = await db
      .select({
        stripeCustomerId: organization.stripeCustomerId,
      })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    const org = orgResult[0];

    if (!org || !org.stripeCustomerId) {
      return reply.status(404).send({ error: "Organization or Stripe customer ID not found" });
    }

    // 3. Get the active subscription
    const subscriptions = await (stripe as Stripe).subscriptions.list({
      customer: org.stripeCustomerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return reply.status(404).send({ error: "No active subscription found" });
    }

    const subscription = subscriptions.data[0];
    const subscriptionItem = subscription.items.data[0];

    // 4. Validate the new price exists
    try {
      await (stripe as Stripe).prices.retrieve(newPriceId);
    } catch (error) {
      return reply.status(400).send({ error: "Invalid price ID" });
    }

    // 5. Update the subscription with the new price
    // Using always_invoice to charge immediately for the proration
    const updatedSubscription = await (stripe as Stripe).subscriptions.update(subscription.id, {
      items: [
        {
          id: subscriptionItem.id,
          price: newPriceId,
        },
      ],
      proration_behavior: "always_invoice", // Immediately invoice the proration amount
    });

    // Get the updated subscription details
    const updatedSubscriptionDetails = await (stripe as Stripe).subscriptions.retrieve(updatedSubscription.id);
    const updatedItem = updatedSubscriptionDetails.items.data[0];

    // 6. Return success response
    return reply.send({
      success: true,
      subscription: {
        id: updatedSubscriptionDetails.id,
        status: updatedSubscriptionDetails.status,
        currentPeriodEnd: new Date(updatedItem.current_period_end * 1000).toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Subscription Update Error:", error);
    return reply.status(500).send({
      error: "Failed to update subscription",
      details: error.message,
    });
  }
}
