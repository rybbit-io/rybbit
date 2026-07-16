import { FastifyReply, FastifyRequest } from "fastify";
import { stripe } from "../../lib/stripe.js";
import { db } from "../../db/postgres/postgres.js";
import { organization } from "../../db/postgres/schema.js";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { invalidateStripeSubscriptionCache } from "../../lib/subscriptionUtils.js";
import dotenv from "dotenv";

dotenv.config();

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function handleWebhook(request: FastifyRequest, reply: FastifyReply) {
  if (!webhookSecret) {
    console.error("Stripe webhook secret is not configured.");
    return reply.status(500).send({ error: "Webhook secret not configured." });
  }

  const sig = request.headers["stripe-signature"];
  let event: Stripe.Event;

  try {
    // Use rawBody instead of request.body for signature verification
    const rawBody = (request.raw as any).body;
    if (!rawBody) {
      return reply.status(400).send("Webhook error: No raw body available");
    }

    event = (stripe as Stripe).webhooks.constructEvent(rawBody, sig as string, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return reply.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("Checkout session completed event received:", session.id);

      // If the checkout session was for a subscription
      if (session.mode === "subscription" && session.customer) {
        const stripeCustomerId = session.customer as string;
        const organizationId = session.metadata?.organizationId; // Retrieve organizationId from metadata

        // A new subscription was created — refresh any cached lookup for this customer
        // (this also clears the account-wide snapshot used by the admin endpoints and cron).
        invalidateStripeSubscriptionCache(stripeCustomerId);

        if (stripeCustomerId && organizationId) {
          try {
            // Check if organization already has this customer ID
            const existingOrg = await db
              .select({ id: organization.id })
              .from(organization)
              .where(eq(organization.stripeCustomerId, stripeCustomerId))
              .limit(1);

            // If the organization doesn't have the customer ID yet, update it
            if (existingOrg.length === 0) {
              console.log(`Updating organization ${organizationId} with Stripe customer ID ${stripeCustomerId}`);
              await db
                .update(organization)
                .set({ stripeCustomerId: stripeCustomerId })
                .where(eq(organization.id, organizationId));
            } else {
              console.log(`Organization ${existingOrg[0].id} already has Stripe customer ID ${stripeCustomerId}`);
            }
          } catch (dbError: any) {
            console.error(`Database error updating organization with Stripe customer ID: ${dbError.message}`);
            // Decide if you should still return 200 to Stripe or signal an error
          }
        } else {
          console.error(
            `Missing required metadata in checkout session ${session.id}. Customer ID: ${stripeCustomerId}, Organization ID: ${organizationId}`
          );
        }
      }
      break;

    // Subscription changes made outside updateSubscription (e.g. via the Stripe billing
    // portal) only reach us through these events — drop the cached lookup so the change
    // is reflected on the next read instead of waiting out the full TTL.
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      const changedSubscription = event.data.object as Stripe.Subscription;
      invalidateStripeSubscriptionCache(changedSubscription.customer as string);
      break;

    // ... handle other event types as needed

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  reply.send({ received: true });
}
