import { roleHasPermission } from "@rybbit/shared";
import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import Stripe from "stripe";
import { db } from "../../db/postgres/postgres.js";
import { organization, user as userSchema } from "../../db/postgres/schema.js";
import { getOrgMembership } from "../../lib/access.js";
import { stripe } from "../../lib/stripe.js";
import { hasHadStripeSubscription } from "../../lib/subscriptionUtils.js";

interface CheckoutRequestBody {
  priceId: string;
  returnUrl: string;
  organizationId: string;
  referral?: string;
}

/** Whether the customer has an active or trialing subscription. Throws if Stripe can't be read. */
async function hasLiveSubscription(stripeCustomerId: string): Promise<boolean> {
  // Filter by status on Stripe's side: a status "all" page holds only the newest 100, so a
  // live subscription behind a long tail of canceled ones would be missed.
  const statuses = ["active", "trialing"] as const;
  const pages = await Promise.all(
    statuses.map(status => (stripe as Stripe).subscriptions.list({ customer: stripeCustomerId, status, limit: 1 }))
  );
  return pages.some((page, i) => page.data.some(sub => sub.status === statuses[i]));
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
    // 1. Verify user has permission to manage billing for this organization
    const membership = await getOrgMembership(userId, organizationId);

    if (!roleHasPermission(membership?.role, "billing:manage")) {
      return reply.status(403).send({
        error: "Only organization owners can manage billing",
      });
    }

    // 2. Get user and organization details
    const [userResult, orgResult] = await Promise.all([
      db
        .select({
          id: userSchema.id,
          email: userSchema.email,
        })
        .from(userSchema)
        .where(eq(userSchema.id, userId))
        .limit(1),
      db
        .select({
          id: organization.id,
          name: organization.name,
          stripeCustomerId: organization.stripeCustomerId,
        })
        .from(organization)
        .where(eq(organization.id, organizationId))
        .limit(1),
    ]);

    const user = userResult[0];
    const org = orgResult[0];

    if (!user || !org) {
      return reply.status(404).send({ error: "User or organization not found" });
    }

    let stripeCustomerId = org.stripeCustomerId;

    // A second checkout would start a second subscription billed alongside the first; plan
    // changes go through update-subscription instead. Read fresh rather than from the
    // subscription cache so a just-finished checkout is seen.
    if (stripeCustomerId && (await hasLiveSubscription(stripeCustomerId))) {
      return reply.status(409).send({
        error:
          "This organization already has an active subscription. To change plans, use the Billing page in your organization settings.",
      });
    }

    // One free trial per organization. A customer created just below has no history. If the
    // history can't be read this throws, so checkout fails and can be retried rather than
    // handing a returning customer another trial.
    const trialEligible = !(await hasHadStripeSubscription(stripeCustomerId, { throwOnError: true }));

    // 3. If the organization doesn't have a Stripe Customer ID, create one
    if (!stripeCustomerId) {
      const customer = await (stripe as Stripe).customers.create({
        email: user.email,
        name: org.name,
        metadata: {
          organizationId: org.id,
          createdByUserId: userId, // For audit trail
          ...(referral && { referral }),
        },
      });
      stripeCustomerId = customer.id;

      // 4. Update the organization with the new Stripe Customer ID
      await db.update(organization).set({ stripeCustomerId }).where(eq(organization.id, organizationId));
    }

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
      // 7-day free trial before charging, unless this organization already had one
      ...(trialEligible && { subscription_data: { trial_period_days: 7 } }),
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
