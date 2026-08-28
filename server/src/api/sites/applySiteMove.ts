import { eq } from "drizzle-orm";
import { db } from "../../db/postgres/postgres.js";
import { memberSiteAccess, sites, teamSiteAccess } from "../../db/postgres/schema.js";
import { invalidateOrganizationSitesAccessCache } from "../../services/sites/siteAccessCache.js";

/**
 * Reassigns a site to a different organization and clears the access grants
 * (restricted member access and team access) tied to the old organization,
 * which no longer apply in the target organization. Also invalidates the
 * sites-access cache for members of both organizations so the change is
 * reflected immediately for both members and Organization-owned API keys.
 *
 * Permission checks are the caller's responsibility.
 */
export async function applySiteMove(siteId: number, sourceOrganizationId: string | null, targetOrganizationId: string) {
  await db.transaction(async tx => {
    await tx
      .update(sites)
      .set({ organizationId: targetOrganizationId, updatedAt: new Date().toISOString() })
      .where(eq(sites.siteId, siteId));
    await tx.delete(memberSiteAccess).where(eq(memberSiteAccess.siteId, siteId));
    await tx.delete(teamSiteAccess).where(eq(teamSiteAccess.siteId, siteId));
  });

  const orgIds = sourceOrganizationId ? [sourceOrganizationId, targetOrganizationId] : [targetOrganizationId];
  await Promise.all(orgIds.map(organizationId => invalidateOrganizationSitesAccessCache(organizationId)));
}
