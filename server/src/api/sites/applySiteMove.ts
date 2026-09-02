import { eq } from "drizzle-orm";
import { db } from "../../db/postgres/postgres.js";
import { memberSiteAccess, segments, sites, teamSiteAccess } from "../../db/postgres/schema.js";
import { invalidateSitesAccessCache } from "../../lib/auth-utils.js";

/**
 * Reassigns a site to a different organization and clears the access grants
 * (restricted member access and team access) tied to the old organization,
 * which no longer apply in the target organization. Also invalidates the
 * sites-access cache for members of both organizations so the change is
 * reflected immediately.
 *
 * Permission checks are the caller's responsibility.
 */
export async function applySiteMove(
  siteId: number,
  sourceOrganizationId: string | null,
  targetOrganizationId: string
) {
  await db.transaction(async tx => {
    await tx
      .update(sites)
      .set({ organizationId: targetOrganizationId, updatedAt: new Date().toISOString() })
      .where(eq(sites.siteId, siteId));
    await tx.delete(memberSiteAccess).where(eq(memberSiteAccess.siteId, siteId));
    await tx.delete(teamSiteAccess).where(eq(teamSiteAccess.siteId, siteId));
    // Site-specific segments travel with the site; they are looked up by
    // (organization, site), so leaving the old organization on them would
    // hide them from the moved site and let the old org's deletion cascade
    // over them. Org-wide segments (null site_id) stay with their org.
    await tx.update(segments).set({ organizationId: targetOrganizationId }).where(eq(segments.siteId, siteId));
  });

  const orgIds = sourceOrganizationId ? [sourceOrganizationId, targetOrganizationId] : [targetOrganizationId];
  const affectedMembers = await db.query.member.findMany({
    where: (m, { inArray }) => inArray(m.organizationId, orgIds),
    columns: { userId: true },
  });
  for (const { userId } of affectedMembers) {
    invalidateSitesAccessCache(userId);
  }
}
