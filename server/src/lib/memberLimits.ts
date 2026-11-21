import { count, eq } from "drizzle-orm";
import { db } from "../db/postgres/postgres.js";
import { member } from "../db/postgres/schema.js";
import type { SiteTransaction } from "../services/sites/withOrganizationSiteLock.js";
import { IS_CLOUD } from "./const.js";

/**
 * The plan's member limit for an organization, or null when it has none
 * (self-hosted instances, unlimited plans).
 */
export async function getPlanMemberLimit(organizationId: string): Promise<number | null> {
  if (!IS_CLOUD) {
    return null;
  }
  // Lazy import: getSubscription pulls in the Stripe client and, through it,
  // modules that import auth.ts, which calls this.
  const { getSubscriptionInner } = await import("../api/stripe/getSubscription.js");
  const subscription = await getSubscriptionInner(organizationId);
  return subscription?.memberLimit ?? null;
}

/**
 * The plan's member limit, checked before anyone joins an organization
 * directly (add-member / create-user). Returns the message to show when the
 * organization is full, null otherwise.
 */
export async function getMemberLimitError(organizationId: string): Promise<string | null> {
  return memberLimitError(organizationId, await getPlanMemberLimit(organizationId));
}

/**
 * The same check against an already-resolved limit, counting through `tx` —
 * the transaction holding the organization's row lock
 * (withOrganizationSiteLock), so two concurrent joins can't both see the last
 * free seat. Resolve the limit before opening that transaction: the plan
 * lookup must not wait on a second pooled connection.
 */
export async function memberLimitError(
  organizationId: string,
  memberLimit: number | null,
  tx?: SiteTransaction
): Promise<string | null> {
  if (memberLimit === null) {
    return null;
  }

  const [row] = await (tx ?? db)
    .select({ value: count() })
    .from(member)
    .where(eq(member.organizationId, organizationId));
  if (Number(row?.value ?? 0) < memberLimit) {
    return null;
  }

  return `You have reached the limit of ${memberLimit} member${memberLimit === 1 ? "" : "s"} for your plan. Please upgrade to add more.`;
}
