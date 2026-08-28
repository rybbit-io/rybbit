import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import Stripe from "stripe";
import { db } from "../../db/postgres/postgres.js";
import { user as userSchema } from "../../db/postgres/schema.js";
import { stripe } from "../../lib/stripe.js";
import {
  getOrganizationBillingAccount,
  getOrCreateOrganizationStripeCustomer,
} from "../../services/billing/organizationBilling.js";

interface CheckoutRequestBody {
  priceId: string;
  returnUrl: string;
  organizationId: string;
  referral?: string;
}

export async function createCheckoutSession(
  request: FastifyRequest<{ Body: CheckoutRequestBody }>,
  reply: FastifyReply
) {
  const { priceId, returnUrl, organizationId, referral } = request.body;
  const userId = request.user?.id;

  if (!userId) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  if (!priceId || !returnUrl || !organizationId) {
    return reply.status(400).send({
      error: "Missing required parameters: priceId, returnUrl, organizationId",
    });
  }

  try {
    const billingAccount = await getOrganizationBillingAccount(userId, organizationId);
    if (!billingAccount.ok && billingAccount.reason === "not_owner") {
      return reply.status(403).send({
        error: "Only organization owners can manage billing",
      });
    }
    if (!billingAccount.ok) {
      return reply.status(404).send({ error: "User or organization not found" });
    }

    const userResult = await db
      .select({
        id: userSchema.id,
        email: userSchema.email,
      })
      .from(userSchema)
      .where(eq(userSchema.id, userId))
      .limit(1);

    const user = userResult[0];
    const org = billingAccount.account;

    if (!user) {
      return reply.status(404).send({ error: "User or organization not found" });
    }

    const stripeCustomerId = await getOrCreateOrganizationStripeCustomer({
      account: org,
      createdByUserId: userId,
      email: user.email,
      referral,
    });

    // 5. Create a Stripe Checkout Session
    const session = await (stripe as Stripe).checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      ui_mode: "embedded",
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      return_url: returnUrl,
      ...(referral && { client_reference_id: referral }),
      // Store organization ID in metadata for webhook processing
      metadata: {
        organizationId: organizationId,
      },
      // 7-day free trial before charging
      subscription_data: { trial_period_days: 7 },
      // Allow promotion codes
      allow_promotion_codes: true,
      // Enable automatic tax calculation if configured in Stripe Tax settings
      automatic_tax: { enabled: true },
      // Configure customer address collection for tax calculation
      customer_update: {
        address: "auto",
      },
      // Allow EU customers to provide their tax ID (VAT number)
      // tax_id_collection: { enabled: true },
    });

    // 6. Return the client secret for embedded checkout
    return reply.send({ clientSecret: session.client_secret });
  } catch (error: any) {
    request.log.error({ err: error }, "Stripe Checkout Session Error");
    return reply.status(500).send({
      error: "Failed to create Stripe checkout session",
      details: error.message,
    });
  }
}
