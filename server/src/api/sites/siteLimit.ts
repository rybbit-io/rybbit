import { eq } from "drizzle-orm";
import { sites } from "../../db/postgres/schema.js";
import { IS_CLOUD } from "../../lib/const.js";
import type { SiteTransaction } from "../../services/sites/withOrganizationSiteLock.js";
import { getSubscriptionInner } from "../stripe/getSubscription.js";

/**
 * Why the target organization cannot take one more site (its plan's site
 * limit, on cloud), or null when it can. Call inside
 * withOrganizationSiteLock(targetOrganizationId) so the count can't race.
 */
export async function targetSiteLimitError(tx: SiteTransaction, targetOrganizationId: string): Promise<string | null> {
  if (!IS_CLOUD) {
    return null;
  }
  const subscription = await getSubscriptionInner(targetOrganizationId);
  const siteLimit = subscription?.siteLimit ?? null;
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
