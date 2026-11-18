import { roleHasPermission } from "@rybbit/shared";
import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import Stripe from "stripe";
import { db } from "../../db/postgres/postgres.js";
import { organization } from "../../db/postgres/schema.js";
import { getOrgMembership } from "../../lib/access.js";
import { stripe } from "../../lib/stripe.js";
import { invalidateStripeSubscriptionCache } from "../../lib/subscriptionUtils.js";
import { usageService } from "../../services/usageService.js";

const idOf = (value: string | { id?: string } | null | undefined): string | null =>
  !value ? null : typeof value === "string" ? value : (value.id ?? null);

/**
 * Charges a past-due subscription's open invoice on the card the customer just saved.
 *
 * The billing portal stores a new card as the customer's default, but Stripe keeps retrying the
 * subscription's own default card, which is the one that failed. This moves the subscription
 * onto the new card and pays the invoice now, so the plan comes back without waiting for
 * Stripe's next scheduled retry.
 *
 * Only charges when the card actually changed: calling it again without a new card does
 * nothing, so it can't be used to hammer a declined card.
 *
 * Replies with `status`: "paid", "failed" (the new card was declined too), "unchanged" (no new
 * card to try) or "none" (nothing is past due).
 */
export async function retryPayment(
  request: FastifyRequest<{ Body: { organizationId?: string } }>,
  reply: FastifyReply
) {
  const userId = request.user?.id;
  const organizationId = request.body?.organizationId;

  if (!userId) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  if (!organizationId) {
    return reply.status(400).send({ error: "Missing required parameter: organizationId" });
  }

  try {
    const membership = await getOrgMembership(userId, organizationId);
    if (!roleHasPermission(membership?.role, "billing:manage")) {
      return reply.status(403).send({ error: "Only organization owners can manage billing" });
    }

    const [org] = await db
      .select({ stripeCustomerId: organization.stripeCustomerId })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);
    if (!org?.stripeCustomerId) {
      return reply.status(404).send({ error: "Organization or Stripe customer ID not found" });
    }
    const customerId = org.stripeCustomerId;

    const pastDue = await (stripe as Stripe).subscriptions.list({
      customer: customerId,
      status: "past_due",
      limit: 10,
    });
    const subscription = pastDue.data
      .filter(sub => sub.collection_method === "charge_automatically")
      .sort((a, b) => b.created - a.created)[0];
    const invoiceId = idOf(subscription?.latest_invoice);
    if (!subscription || !invoiceId) {
      return reply.send({ status: "none" });
    }

    const customer = await (stripe as Stripe).customers.retrieve(customerId);
    const newCard = customer.deleted ? null : idOf(customer.invoice_settings?.default_payment_method);
    if (!newCard || newCard === idOf(subscription.default_payment_method)) {
      return reply.send({ status: "unchanged" });
    }

    await (stripe as Stripe).subscriptions.update(subscription.id, { default_payment_method: newCard });

    let paid = false;
    try {
      const invoice = await (stripe as Stripe).invoices.pay(invoiceId);
      paid = invoice.status === "paid";
    } catch (error) {
      // A decline, or a bank that wants the customer to confirm the charge. The card is on the
      // subscription now, so Stripe's own retries use it too.
      if (!(error instanceof Stripe.errors.StripeCardError)) throw error;
      request.log.info({ organizationId, code: error.code }, "Retried payment was declined");
    }

    // The plan is back (or still off): drop the cached answer and switch the sites accordingly.
    invalidateStripeSubscriptionCache(customerId);
    usageService.requestOrganizationRefresh(organizationId);

    return reply.send({ status: paid ? "paid" : "failed" });
  } catch (error: any) {
    request.log.error({ err: error, organizationId }, "Stripe retry payment error");
    return reply.status(500).send({ error: "Failed to retry the payment" });
  }
}
