import { FastifyReply, FastifyRequest } from "fastify";
import { stripe } from "../../lib/stripe.js";
import { db } from "../../db/postgres/postgres.js";
import { organization, member } from "../../db/postgres/schema.js";
import { eq, and } from "drizzle-orm";
import Stripe from "stripe";

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

    // 3. Create a Stripe Billing Portal Session, with optional direct flow
    const sessionConfig: Stripe.BillingPortal.SessionCreateParams = {
      customer: org.stripeCustomerId,
      return_url: returnUrl, // The user will be redirected here after managing their billing
    };

    // If a specific flow is requested, add it to the configuration
    if (flowType) {
      if (flowType === "subscription_update") {
        // For subscription_update flow, we need to fetch the subscription ID first
        // Check both active and trialing statuses (trials have status "trialing")
        let subscriptions = await (stripe as Stripe).subscriptions.list({
          customer: org.stripeCustomerId,
          status: "active",
          limit: 1,
        });

        if (subscriptions.data.length === 0) {
          subscriptions = await (stripe as Stripe).subscriptions.list({
            customer: org.stripeCustomerId,
            status: "trialing",
            limit: 1,
          });
        }

        if (subscriptions.data.length === 0) {
          return reply.status(404).send({ error: "No active subscription found" });
        }

        const subscriptionId = subscriptions.data[0].id;

        sessionConfig.flow_data = {
          type: "subscription_update",
          subscription_update: {
            subscription: subscriptionId,
          },
        };
      } else if (flowType === "subscription_cancel") {
        // For subscription_cancel flow, we need to fetch the subscription ID first
        // Check both active and trialing statuses (trials have status "trialing")
        let subscriptions = await (stripe as Stripe).subscriptions.list({
          customer: org.stripeCustomerId,
          status: "active",
          limit: 1,
        });

        if (subscriptions.data.length === 0) {
          subscriptions = await (stripe as Stripe).subscriptions.list({
            customer: org.stripeCustomerId,
            status: "trialing",
            limit: 1,
          });
        }

        if (subscriptions.data.length === 0) {
          return reply.status(404).send({ error: "No active subscription found" });
        }

        const subscriptionId = subscriptions.data[0].id;

        sessionConfig.flow_data = {
          type: "subscription_cancel",
          subscription_cancel: {
            subscription: subscriptionId,
          },
        };
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
    console.error("Stripe Portal Session Error:", error);
    return reply.status(500).send({
      error: "Failed to create Stripe portal session",
      details: error.message,
    });
  }
}
