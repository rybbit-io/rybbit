import { count, eq } from "drizzle-orm";
import { db } from "../db/postgres/postgres.js";
import { member } from "../db/postgres/schema.js";
import { IS_CLOUD } from "./const.js";

/**
 * The plan's member limit, checked before anyone joins an organization — by
 * invitation (the better-auth hook) or directly (add-member / create-user).
 * Returns the message to show when the organization is full, null otherwise.
 * Self-hosted instances have no plans and never hit a limit.
 */
export async function getMemberLimitError(organizationId: string): Promise<string | null> {
  if (!IS_CLOUD) {
    return null;
  }

  // Lazy import: getSubscription pulls in the Stripe client and, through it,
  // modules that import auth.ts, which calls this.
  const { getSubscriptionInner } = await import("../api/stripe/getSubscription.js");
  const subscription = await getSubscriptionInner(organizationId);
  const memberLimit = subscription?.memberLimit ?? null;
  if (memberLimit === null) {
    return null;
  }

  const [row] = await db.select({ value: count() }).from(member).where(eq(member.organizationId, organizationId));
  if (Number(row?.value ?? 0) < memberLimit) {
    return null;
  }

  return `You have reached the limit of ${memberLimit} member${memberLimit === 1 ? "" : "s"} for your plan. Please upgrade to add more.`;
}
