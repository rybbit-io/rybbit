import { eq, sql } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "../../db/postgres/postgres.js";
import { organization } from "../../db/postgres/schema.js";
import { getOrgMembership, isOrgOwner } from "../../lib/access.js";
import { stripe } from "../../lib/stripe.js";

/**
 * Organization Billing is the single place that resolves the organization a
 * user may bill and the Stripe subscription that billing operations should act
 * on. Product entitlement selection remains in subscriptionUtils: "which
 * Stripe object is current?" and "which product entitlement wins?" are
 * intentionally different questions.
 */

export interface OrganizationBillingAccount {
  id: string;
  name: string;
  stripeCustomerId: string | null;
}

export type OrganizationBillingAccountResult =
  | { ok: true; account: OrganizationBillingAccount }
  | { ok: false; reason: "not_owner" | "organization_not_found" };

/** Resolve the billing account only when the requesting user owns it. */
export async function getOrganizationBillingAccount(
  userId: string,
  organizationId: string
): Promise<OrganizationBillingAccountResult> {
  const membership = await getOrgMembership(userId, organizationId);
  if (!isOrgOwner(membership)) {
    return { ok: false, reason: "not_owner" };
  }

  const rows = await db
    .select({
      id: organization.id,
      name: organization.name,
      stripeCustomerId: organization.stripeCustomerId,
    })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  const account = rows[0];
  return account ? { ok: true, account } : { ok: false, reason: "organization_not_found" };
}

export interface CreateOrganizationStripeCustomerInput {
  account: OrganizationBillingAccount;
  createdByUserId: string;
  email: string;
  referral?: string;
}

/**
 * Return the Organization's Stripe customer, creating and linking it exactly
 * once when absent. The row lock spans the external creation deliberately:
 * checkout is low-volume, while duplicate Stripe customers are permanent
 * ambiguity that every later billing operation would have to understand.
 */
export async function getOrCreateOrganizationStripeCustomer({
  account,
  createdByUserId,
  email,
  referral,
}: CreateOrganizationStripeCustomerInput): Promise<string> {
  if (account.stripeCustomerId) {
    return account.stripeCustomerId;
  }
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }
  const stripeClient = stripe;

  return db.transaction(async transaction => {
    // Serialize only customer creation for this Organization. A concurrent
    // checkout re-reads the winner after acquiring the lock.
    await transaction.execute(
      sql`SELECT ${organization.id} FROM ${organization} WHERE ${organization.id} = ${account.id} FOR UPDATE`
    );

    const rows = await transaction
      .select({ stripeCustomerId: organization.stripeCustomerId })
      .from(organization)
      .where(eq(organization.id, account.id))
      .limit(1);

    if (!rows[0]) {
      throw new Error(`Organization not found while linking Stripe customer: ${account.id}`);
    }
    if (rows[0].stripeCustomerId) {
      return rows[0].stripeCustomerId;
    }

    const customer = await stripeClient.customers.create({
      email,
      name: account.name,
      metadata: {
        organizationId: account.id,
        createdByUserId,
        ...(referral && { referral }),
      },
    });
    // Never delete the Stripe customer as compensation for a database error:
    // network failures can make the write outcome ambiguous. Its metadata is
    // sufficient for reconciliation, while deleting a possibly-linked
    // customer would leave the Organization pointing at a missing object.
    await transaction
      .update(organization)
      .set({ stripeCustomerId: customer.id })
      .where(eq(organization.id, account.id));

    return customer.id;
  });
}

const CURRENT_SUBSCRIPTION_CACHE_TTL_MS = 60_000;
const currentSubscriptionCache = new Map<string, { value: Stripe.Subscription | null; expiresAt: number }>();
const currentSubscriptionInflight = new Map<string, Promise<Stripe.Subscription | null>>();
const currentSubscriptionGeneration = new Map<string, number>();

export type StripeSubscriptionSelection = "newest" | "active_first";

function selectCurrentSubscription(
  subscriptions: Stripe.Subscription[],
  selection: StripeSubscriptionSelection
): Stripe.Subscription | null {
  const eligible = subscriptions.filter(
    subscription => subscription.status === "active" || subscription.status === "trialing"
  );
  const candidates =
    selection === "active_first" && eligible.some(subscription => subscription.status === "active")
      ? eligible.filter(subscription => subscription.status === "active")
      : eligible;

  return candidates.reduce<Stripe.Subscription | null>((current, subscription) => {
    if (!current || subscription.created > current.created) {
      return subscription;
    }
    return current;
  }, null);
}

async function fetchCurrentStripeSubscription(
  stripeCustomerId: string,
  selection: StripeSubscriptionSelection = "newest"
): Promise<Stripe.Subscription | null> {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "all",
    limit: 100,
    expand: ["data.plan.product"],
  });

  return selectCurrentSubscription(subscriptions.data, selection);
}

type CurrentStripeSubscriptionOptions =
  | {
      throwOnError?: boolean;
      /** Bypass cached/in-flight reads for decisions that will mutate money state. */
      fresh?: boolean;
      selection?: "newest";
    }
  | {
      /** Non-default selection has no policy-compatible stale cache, so errors must propagate. */
      throwOnError: true;
      fresh?: boolean;
      selection: "active_first";
    };

/**
 * Return the newest active or trialing subscription for a customer.
 *
 * A short-lived cache collapses repeated reads. If Stripe is temporarily
 * unavailable, the last known value (including a known null) wins over either
 * mutating the wrong subscription or silently treating a paying account as
 * free.
 */
export async function getCurrentStripeSubscription(
  stripeCustomerId: string | null,
  { throwOnError = false, fresh = false, selection = "newest" }: CurrentStripeSubscriptionOptions = {}
): Promise<Stripe.Subscription | null> {
  if (!stripeCustomerId) {
    return null;
  }

  const cached = currentSubscriptionCache.get(stripeCustomerId);
  if (fresh || selection !== "newest") {
    try {
      return await fetchCurrentStripeSubscription(stripeCustomerId, selection);
    } catch (error) {
      if (throwOnError || selection !== "newest") throw error;
      return cached ? cached.value : null;
    }
  }

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  let refresh = currentSubscriptionInflight.get(stripeCustomerId);
  if (!refresh) {
    const refreshGeneration = currentSubscriptionGeneration.get(stripeCustomerId) ?? 0;
    refresh = fetchCurrentStripeSubscription(stripeCustomerId)
      .then(value => {
        // A webhook may invalidate while Stripe is in flight. Never let that
        // older response repopulate the cache after invalidation.
        if ((currentSubscriptionGeneration.get(stripeCustomerId) ?? 0) === refreshGeneration) {
          currentSubscriptionCache.set(stripeCustomerId, {
            value,
            expiresAt: Date.now() + CURRENT_SUBSCRIPTION_CACHE_TTL_MS,
          });
        }
        return value;
      })
      .finally(() => {
        currentSubscriptionInflight.delete(stripeCustomerId);
      });
    currentSubscriptionInflight.set(stripeCustomerId, refresh);
  }

  try {
    return await refresh;
  } catch (error) {
    if (cached) {
      return cached.value;
    }
    if (throwOnError) {
      throw error;
    }
    return null;
  }
}

/** Drop current-subscription state after a Stripe mutation or webhook. */
export function invalidateCurrentStripeSubscription(stripeCustomerId: string | null): void {
  if (stripeCustomerId) {
    currentSubscriptionCache.delete(stripeCustomerId);
    currentSubscriptionGeneration.set(stripeCustomerId, (currentSubscriptionGeneration.get(stripeCustomerId) ?? 0) + 1);
  }
}
