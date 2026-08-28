import { FastifyReply, FastifyRequest } from "fastify";
import { stripe } from "../../lib/stripe.js";
import Stripe from "stripe";
import { invalidateStripeSubscriptionCache } from "../../lib/subscriptionUtils.js";
import {
  getCurrentStripeSubscription,
  getOrganizationBillingAccount,
} from "../../services/billing/organizationBilling.js";

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
    const billingAccount = await getOrganizationBillingAccount(userId, organizationId);
    if (!billingAccount.ok && billingAccount.reason === "not_owner") {
      return reply.status(403).send({
        error: "Only organization owners can manage billing",
      });
    }
    if (!billingAccount.ok || !billingAccount.account.stripeCustomerId) {
      return reply.status(404).send({ error: "Organization or Stripe customer ID not found" });
    }
    const stripeCustomerId = billingAccount.account.stripeCustomerId;

    const subscription = await getCurrentStripeSubscription(stripeCustomerId, {
      throwOnError: true,
      fresh: true,
      selection: "active_first",
    });

    if (!subscription) {
      return reply.status(404).send({ error: "No active subscription found" });
    }
    const subscriptionItem = subscription.items.data[0];

    // 4. Validate the new price exists. Only Stripe's missing-resource error means the
    // price ID is invalid; anything else (outage, rate limit, network) falls through to
    // the 500 path below without mutating the subscription.
    try {
      await (stripe as Stripe).prices.retrieve(newPriceId);
    } catch (error) {
      if (error instanceof Stripe.errors.StripeInvalidRequestError && error.code === "resource_missing") {
        return reply.status(400).send({ error: "Invalid price ID" });
      }
      throw error;
    }

    // 5. Update the subscription with the new price
    const isTrialing = subscription.status === "trialing";
    const updatedSubscription = await (stripe as Stripe).subscriptions.update(subscription.id, {
      items: [
        {
          id: subscriptionItem.id,
          price: newPriceId,
        },
      ],
      // For trialing subscriptions, swap the plan without charging — preserve the trial
      proration_behavior: isTrialing ? "none" : "always_invoice",
      ...(isTrialing && subscription.trial_end && { trial_end: subscription.trial_end }),
    });

    // The plan changed, so drop the cached subscription for this customer (also clears the
    // account-wide snapshot used by the admin endpoints and usage cron).
    invalidateStripeSubscriptionCache(stripeCustomerId);

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
    request.log.error({ err: error }, "Subscription Update Error");
    return reply.status(500).send({
      error: "Failed to update subscription",
      details: error.message,
    });
  }
}
