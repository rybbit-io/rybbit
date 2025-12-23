import { eq, and } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import Stripe from "stripe";
import { db } from "../../db/postgres/postgres.js";
import { organization, user as userSchema, member } from "../../db/postgres/schema.js";
import { stripe } from "../../lib/stripe.js";

interface CheckoutRequestBody {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  organizationId: string;
}

export async function createCheckoutSession(
  request: FastifyRequest<{ Body: CheckoutRequestBody }>,
  reply: FastifyReply
) {
  const { priceId, successUrl, cancelUrl, organizationId } = request.body;
  const userId = request.user?.id;

  if (!userId) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  if (!priceId || !successUrl || !cancelUrl || !organizationId) {
    return reply.status(400).send({
      error: "Missing required parameters: priceId, successUrl, cancelUrl, organizationId",
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

    // 3. If the organization doesn't have a Stripe Customer ID, create one
    if (!stripeCustomerId) {
      const customer = await (stripe as Stripe).customers.create({
        email: user.email,
        name: org.name,
        metadata: {
          organizationId: org.id,
          createdByUserId: userId, // For audit trail
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
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      // Store organization ID in metadata for webhook processing
      metadata: {
        organizationId: organizationId,
      },
      // Allow promotion codes
      allow_promotion_codes: true,
      // Enable automatic tax calculation if configured in Stripe Tax settings
      automatic_tax: { enabled: true },
      // Configure customer address collection for tax calculation
      customer_update: {
        address: "auto",
      },
    });

    // 6. Return the Checkout Session URL
    return reply.send({ checkoutUrl: session.url });
  } catch (error: any) {
    console.error("Stripe Checkout Session Error:", error);
    return reply.status(500).send({
      error: "Failed to create Stripe checkout session",
      details: error.message,
    });
  }
}
