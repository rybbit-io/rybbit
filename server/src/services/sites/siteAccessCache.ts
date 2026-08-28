import NodeCache from "node-cache";
import { eq } from "drizzle-orm";
import { db } from "../../db/postgres/postgres.js";
import { member } from "../../db/postgres/schema.js";
import { logger } from "../../lib/logger/logger.js";

const siteAccessCache = new NodeCache({
  stdTTL: 15,
  checkperiod: 30,
  useClones: false,
});

export function readSiteAccessCache<T>(key: string): T | undefined {
  return siteAccessCache.get<T>(key);
}

export function writeSiteAccessCache<T>(key: string, value: T): void {
  siteAccessCache.set(key, value);
}

export function removeSiteAccessCacheEntry(key: string): void {
  siteAccessCache.del(key);
}

export function invalidateSitesAccessCache(userId: string): void {
  siteAccessCache.del(`${userId}:true`);
  siteAccessCache.del(`${userId}:false`);
}

/**
 * Invalidate every cached Site-access view affected by an Organization mutation.
 * This includes the Organization-owned API-key view and both user views for
 * every current member, because team gating can change access even for members
 * who are not on the mutated team.
 */
export async function invalidateOrganizationSitesAccessCache(organizationId: string): Promise<void> {
  siteAccessCache.del(`org:${organizationId}`);

  try {
    const organizationMembers = await db
      .select({ userId: member.userId })
      .from(member)
      .where(eq(member.organizationId, organizationId));

    for (const { userId } of organizationMembers) {
      invalidateSitesAccessCache(userId);
    }
  } catch (error) {
    // The Organization API-key entry is already gone. User entries self-heal
    // within 15 seconds; do not turn one membership-query failure into a
    // process-wide cold start for every tenant.
    logger.error({ err: error, organizationId }, "Failed to resolve Organization members for cache invalidation");
  }
}
