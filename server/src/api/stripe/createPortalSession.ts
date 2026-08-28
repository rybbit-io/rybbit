import { FastifyReply, FastifyRequest } from "fastify";
import { stripe } from "../../lib/stripe.js";
import Stripe from "stripe";
import {
  getCurrentStripeSubscription,
  getOrganizationBillingAccount,
} from "../../services/billing/organizationBilling.js";

interface PortalRequestBody {
  returnUrl: string;
  organizationId: string;
  flowType?: "subscription_update" | "subscription_cancel" | "payment_method_update";
}

export async function createPortalSession(request: FastifyRequest<{ Body: PortalRequestBody }>, reply: FastifyReply) {
  const { returnUrl, organizationId, flowType } = request.body;
  const userId = request.user?.id;

  if (!userId) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  if (!returnUrl || !organizationId) {
    return reply.status(400).send({
      error: "Missing required parameters: returnUrl, organizationId",
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

    // 3. Create a Stripe Billing Portal Session, with optional direct flow
    const sessionConfig: Stripe.BillingPortal.SessionCreateParams = {
      customer: stripeCustomerId,
      return_url: returnUrl, // The user will be redirected here after managing their billing
    };

    // If a specific flow is requested, add it to the configuration
    if (flowType) {
      if (flowType === "subscription_update") {
        const subscription = await getCurrentStripeSubscription(stripeCustomerId, {
          throwOnError: true,
          fresh: true,
          selection: "active_first",
        });
        if (!subscription) {
          return reply.status(404).send({ error: "No active subscription found" });
        }

        sessionConfig.flow_data = {
          type: "subscription_update",
          subscription_update: {
            subscription: subscription.id,
          },
        };
      } else if (flowType === "subscription_cancel") {
        const subscription = await getCurrentStripeSubscription(stripeCustomerId, {
          throwOnError: true,
          fresh: true,
          selection: "active_first",
        });
        if (!subscription) {
          return reply.status(404).send({ error: "No active subscription found" });
        }

        // Stripe rejects a subscription_cancel flow when the subscription is already scheduled
        // to cancel at period end ("already set to be canceled at period end"). In that case,
        // fall back to the plain billing portal so the user can review or resume instead of
        // hitting a 400.
        if (!subscription.cancel_at_period_end) {
          sessionConfig.flow_data = {
            type: "subscription_cancel",
            subscription_cancel: {
              subscription: subscription.id,
            },
          };
        }
      } else if (flowType === "payment_method_update") {
        sessionConfig.flow_data = {
          type: "payment_method_update",
        };
      }
    }

    const portalSession = await (stripe as Stripe).billingPortal.sessions.create(sessionConfig);

    // 4. Return the Billing Portal Session URL
    return reply.send({ portalUrl: portalSession.url });
  } catch (error: any) {
    request.log.error({ err: error }, "Stripe Portal Session Error");
    return reply.status(500).send({
      error: "Failed to create Stripe portal session",
      details: error.message,
    });
  }
}
