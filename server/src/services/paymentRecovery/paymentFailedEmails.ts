import { and, eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "../../db/postgres/postgres.js";
import { lifecycleEmailLog, member, organization, user } from "../../db/postgres/schema.js";
import { isIdempotencyConflict, sendPaymentFailedEmail } from "../../lib/email/email.js";
import type { PaymentFailedEmailProps } from "../../lib/email/templates/PaymentFailedEmail.js";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { getBestSubscription, invalidateStripeSubscriptionCache } from "../../lib/subscriptionUtils.js";

const idOf = (value: string | { id?: string } | null | undefined): string | null =>
  !value ? null : typeof value === "string" ? value : (value.id ?? null);

/** The subscription an invoice bills for, wherever this API version keeps it. */
export function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const legacy = (invoice as { subscription?: string | { id: string } | null }).subscription;
  return idOf(legacy) ?? idOf(invoice.parent?.subscription_details?.subscription);
}

type Org = { id: string; name: string };

/**
 * Emails an organization's owners when a card charge for its plan fails, and again if Stripe
 * gives up and cancels a plan that had been paid for. Each goes out once per owner and invoice
 * (or subscription): the lifecycle_email_log row is claimed before sending and released if the
 * send fails, so a later failed attempt on the same invoice tries again.
 *
 * Called from the Stripe webhook, which must still be acknowledged when an email can't be sent:
 * nothing here throws.
 */
class PaymentFailedEmails {
  private logger = createServiceLogger("payment-recovery");

  private async organizationOf(stripeCustomerId: string): Promise<Org | null> {
    const [org] = await db
      .select({ id: organization.id, name: organization.name })
      .from(organization)
      .where(eq(organization.stripeCustomerId, stripeCustomerId))
      .limit(1);
    return org ?? null;
  }

  private async notifyOwners(
    org: Org,
    emailKey: string,
    props: Omit<PaymentFailedEmailProps, "organizationId" | "organizationName">
  ) {
    const owners = await db
      .select({ userId: user.id, email: user.email })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(and(eq(member.organizationId, org.id), eq(member.role, "owner")));

    for (const owner of owners) {
      const [claimed] = await db
        .insert(lifecycleEmailLog)
        .values({ userId: owner.userId, emailKey })
        .onConflictDoNothing()
        .returning({ id: lifecycleEmailLog.id });
      if (!claimed) continue;

      try {
        await sendPaymentFailedEmail(
          owner.email,
          { ...props, organizationId: org.id, organizationName: org.name },
          `payment-recovery:${owner.userId}:${emailKey}`
        );
        this.logger.info({ organizationId: org.id, userId: owner.userId, emailKey }, "Sent payment recovery email");
      } catch (error) {
        if (isIdempotencyConflict(error)) continue;
        await db.delete(lifecycleEmailLog).where(eq(lifecycleEmailLog.id, claimed.id));
        this.logger.error(
          { err: error, organizationId: org.id, userId: owner.userId, emailKey },
          "Error sending payment recovery email"
        );
      }
    }
  }

  /** A renewal (or the first charge after a trial) was declined. */
  async onPaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    try {
      const customerId = idOf(invoice.customer);
      // A declined card at checkout (subscription_create) is handled on the checkout page, and
      // invoiced subscriptions have no card to update.
      if (
        !customerId ||
        !invoice.id ||
        invoice.billing_reason !== "subscription_cycle" ||
        invoice.collection_method !== "charge_automatically" ||
        invoice.amount_due <= 0 ||
        !invoiceSubscriptionId(invoice)
      ) {
        return;
      }
      const org = await this.organizationOf(customerId);
      if (!org) return;

      // Sites keep collecting while a plan that has been paid for is retried, and during the
      // grace period after a trial; otherwise the plan is off until the charge goes through.
      invalidateStripeSubscriptionCache(customerId);
      const subscription = await getBestSubscription(org.id, customerId);
      const tracking =
        subscription.source === "stripe" && subscription.pastDue
          ? "on"
          : subscription.source !== "free"
            ? "unknown"
            : subscription.trialGrace && subscription.trialGrace.endsAt > new Date()
              ? "on"
              : "paused";

      await this.notifyOwners(org, `payment_failed:${invoice.id}`, {
        stage: "failed",
        amountDue: invoice.amount_due,
        currency: invoice.currency,
        nextAttemptAt: invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000) : null,
        tracking,
      });
    } catch (error) {
      this.logger.error({ err: error, invoiceId: invoice.id }, "Error handling a failed payment");
    }
  }

  /** Stripe ran out of retries and canceled the subscription. */
  async onSubscriptionCanceled(subscription: Stripe.Subscription): Promise<void> {
    try {
      const customerId = idOf(subscription.customer);
      if (!customerId || subscription.cancellation_details?.reason !== "payment_failed") return;
      const org = await this.organizationOf(customerId);
      if (!org) return;

      // A trial that was never paid for moves into its grace period, which has its own emails;
      // an organization with another plan has lost nothing.
      invalidateStripeSubscriptionCache(customerId);
      const best = await getBestSubscription(org.id, customerId);
      if (best.source !== "free" || best.trialGrace) return;

      await this.notifyOwners(org, `payment_canceled:${subscription.id}`, { stage: "canceled" });
    } catch (error) {
      this.logger.error({ err: error, subscriptionId: subscription.id }, "Error handling a canceled subscription");
    }
  }
}

export const paymentFailedEmails = new PaymentFailedEmails();
