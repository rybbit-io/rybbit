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
    request.log.error("Stripe webhook secret is not configured");
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
    request.log.warn({ err }, "Stripe webhook signature verification failed");
    return reply.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object as Stripe.Checkout.Session;
      request.log.info({ sessionId: session.id }, "Stripe checkout session completed");

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
              request.log.info({ organizationId, stripeCustomerId }, "Linking organization to Stripe customer");
              await db
                .update(organization)
                .set({ stripeCustomerId: stripeCustomerId })
                .where(eq(organization.id, organizationId));
            } else {
              request.log.info(
                { organizationId: existingOrg[0].id, stripeCustomerId },
                "Organization already linked to Stripe customer"
              );
            }
          } catch (dbError: any) {
            request.log.error({ err: dbError, stripeCustomerId }, "Failed to link organization to Stripe customer");
            // Retriable failure: the org is still not linked to its Stripe customer.
            // Return a 5xx so Stripe retries the webhook; acking here would drop the
            // event permanently and leave the organization unlinked forever.
            return reply.status(500).send({ error: "Failed to link organization to Stripe customer." });
          }
        } else {
          // Non-retriable: the checkout session itself lacks organizationId metadata,
          // so a Stripe retry would deliver the exact same payload. Ack with 200 and
          // log — retrying can never fix this.
          request.log.warn(
            { sessionId: session.id, stripeCustomerId, organizationId },
            "Stripe checkout session is missing required metadata"
          );
        }
      }
      break;

    // Subscription changes made outside updateSubscription (e.g. via the Stripe billing
    // portal) only reach us through these events — drop the cached lookup so the change
    // is reflected on the next read instead of waiting out the full TTL.
    // Note: invalidateStripeSubscriptionCache is a synchronous in-process Map delete —
    // it cannot fail, so there is no swallowed-error path here to convert to a 5xx.
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      const changedSubscription = event.data.object as Stripe.Subscription;
      invalidateStripeSubscriptionCache(changedSubscription.customer as string);
      break;

    // ... handle other event types as needed

    default:
      request.log.debug({ eventType: event.type }, "Ignoring unhandled Stripe webhook event");
  }

  // Return a 200 response to acknowledge receipt of the event
  reply.send({ received: true });
}
