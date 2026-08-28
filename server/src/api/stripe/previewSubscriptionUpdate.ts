import { FastifyReply, FastifyRequest } from "fastify";
import { stripe } from "../../lib/stripe.js";
import Stripe from "stripe";
import {
  getCurrentStripeSubscription,
  getOrganizationBillingAccount,
} from "../../services/billing/organizationBilling.js";

interface PreviewSubscriptionBody {
  organizationId: string;
  newPriceId: string;
}

export async function previewSubscriptionUpdate(
  request: FastifyRequest<{ Body: PreviewSubscriptionBody }>,
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
    const currentItem = subscription.items.data[0];
    const currentPeriodEnd = currentItem.current_period_end;

    // 4. Get price details for both current and new prices
    const [currentPrice, newPrice] = await Promise.all([
      stripe!.prices.retrieve(currentItem.price.id),
      stripe!.prices.retrieve(newPriceId),
    ]);

    const isTrialing = subscription.status === "trialing";

    // 5. For trialing subscriptions, no proration is needed — just return plan details
    if (isTrialing) {
      return reply.send({
        success: true,
        preview: {
          isTrialing: true,
          currentPlan: {
            priceId: currentItem.price.id,
            amount: currentPrice.unit_amount || 0,
            interval: currentPrice.recurring?.interval || "month",
          },
          newPlan: {
            priceId: newPriceId,
            amount: newPrice.unit_amount || 0,
            interval: newPrice.recurring?.interval || "month",
          },
          proration: {
            credit: 0,
            charge: 0,
            immediatePayment: 0,
            nextBillingDate: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
          },
        },
      });
    }

    // 6. Create a preview of the upcoming invoice with proration
    const upcomingInvoice = await (stripe as Stripe).invoices.createPreview({
      customer: stripeCustomerId,
      subscription: subscription.id,
      subscription_details: {
        items: [
          {
            id: currentItem.id,
            price: newPriceId,
          },
        ],
        proration_behavior: "always_invoice",
      },
    });

    // 7. Calculate proration details
    const prorationItems = upcomingInvoice.lines.data.filter(item => {
      // Proration flag is nested in parent.subscription_item_details
      return item.parent?.subscription_item_details?.proration === true;
    });

    let proratedCredit = 0;
    let proratedCharge = 0;

    prorationItems.forEach(item => {
      if (item.amount < 0) {
        proratedCredit += Math.abs(item.amount);
      } else {
        proratedCharge += item.amount;
      }
    });

    const immediateCharge = upcomingInvoice.amount_due;

    // 8. Return preview information
    return reply.send({
      success: true,
      preview: {
        isTrialing: false,
        currentPlan: {
          priceId: currentItem.price.id,
          amount: currentPrice.unit_amount || 0,
          interval: currentPrice.recurring?.interval || "month",
        },
        newPlan: {
          priceId: newPriceId,
          amount: newPrice.unit_amount || 0,
          interval: newPrice.recurring?.interval || "month",
        },
        proration: {
          credit: proratedCredit / 100, // Convert from cents to dollars
          charge: proratedCharge / 100,
          immediatePayment: immediateCharge / 100,
          nextBillingDate: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
        },
      },
    });
  } catch (error: any) {
    request.log.error({ err: error }, "Subscription Preview Error");
    return reply.status(500).send({
      error: "Failed to preview subscription update",
      details: error.message,
    });
  }
}
