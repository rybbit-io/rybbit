import { eq } from "drizzle-orm";
import { sites } from "../../db/postgres/schema.js";
import { IS_CLOUD } from "../../lib/const.js";
import type { SiteTransaction } from "../../services/sites/withOrganizationSiteLock.js";
import { getSubscriptionInner } from "../stripe/getSubscription.js";

/**
 * The plan's site limit for an organization (null when it has none, or on
 * self-hosted instances). Resolve it BEFORE opening the locked transaction:
 * the subscription lookup uses its own connections, and a transaction that
 * waits on a second pooled connection can exhaust the pool.
 */
export async function getPlanSiteLimit(organizationId: string): Promise<number | null> {
  if (!IS_CLOUD) {
    return null;
  }
  const subscription = await getSubscriptionInner(organizationId);
  return subscription?.siteLimit ?? null;
}

/**
 * Why the target organization cannot take one more site under `siteLimit`, or
 * null when it can. Call inside withOrganizationSiteLock(targetOrganizationId)
 * so the count can't race.
 */
export async function targetSiteLimitError(
  tx: SiteTransaction,
  targetOrganizationId: string,
  siteLimit: number | null
): Promise<string | null> {
  if (siteLimit === null) {
    return null;
  }
  const existingSites = await tx
    .select({ siteId: sites.siteId })
    .from(sites)
    .where(eq(sites.organizationId, targetOrganizationId));
  if (existingSites.length < siteLimit) {
    return null;
  }
  return `The target organization has reached its limit of ${siteLimit} website${
    siteLimit === 1 ? "" : "s"
  }. Please upgrade it to add more.`;
}
