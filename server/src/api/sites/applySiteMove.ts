import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../db/postgres/postgres.js";
import {
  annotations,
  importStatus,
  memberSiteAccess,
  segments,
  sites,
  siteTransfers,
  teamSiteAccess,
} from "../../db/postgres/schema.js";
import type { SiteTransaction } from "../../services/sites/withOrganizationSiteLock.js";
import { invalidateOrganizationSitesCache, invalidateSitesAccessCache } from "../../lib/auth-utils.js";

/**
 * Reassigns a site to a different organization and clears the access grants
 * (restricted member access and team access) tied to the old organization,
 * which no longer apply in the target organization. Also invalidates the
 * sites-access cache for members of both organizations so the change is
 * reflected immediately.
 *
 * The move only happens while the site still belongs to
 * `sourceOrganizationId` — a compare-and-swap on the site row, which also
 * serializes concurrent moves of the same site. Returns false, changing
 * nothing, when another move got there first.
 *
 * Permission checks are the caller's responsibility.
 */
export async function applySiteMove(
  siteId: number,
  sourceOrganizationId: string | null,
  targetOrganizationId: string,
  transaction?: SiteTransaction
): Promise<boolean> {
  const move = async (tx: SiteTransaction) => {
    const moved = await tx
      .update(sites)
      .set({ organizationId: targetOrganizationId, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(sites.siteId, siteId),
          sourceOrganizationId === null ? isNull(sites.organizationId) : eq(sites.organizationId, sourceOrganizationId)
        )
      )
      .returning({ siteId: sites.siteId });
    if (moved.length === 0) {
      return false;
    }
    await tx.delete(memberSiteAccess).where(eq(memberSiteAccess.siteId, siteId));
    await tx.delete(teamSiteAccess).where(eq(teamSiteAccess.siteId, siteId));
    // Site-specific segments travel with the site; they are looked up by
    // (organization, site), so leaving the old organization on them would
    // hide them from the moved site and let the old org's deletion cascade
    // over them. Org-wide segments (null site_id) stay with their org.
    await tx.update(segments).set({ organizationId: targetOrganizationId }).where(eq(segments.siteId, siteId));
    // Same for the site's own annotations (org-wide ones stay) and its import
    // history, which carry the organization for access checks and cascades.
    await tx.update(annotations).set({ organizationId: targetOrganizationId }).where(eq(annotations.siteId, siteId));
    await tx.update(importStatus).set({ organizationId: targetOrganizationId }).where(eq(importStatus.siteId, siteId));
    // A pending hand-over was authorized by the old organization.
    await tx.delete(siteTransfers).where(eq(siteTransfers.siteId, siteId));
    return true;
  };
  if (transaction) return move(transaction);
  const moved = await db.transaction(move);
  if (moved) {
    await invalidateSiteMoveAccess(sourceOrganizationId, targetOrganizationId);
  }
  return moved;
}

// Call after the enclosing transaction commits so no request can repopulate
// the old access list between invalidation and commit.
export async function invalidateSiteMoveAccess(sourceOrganizationId: string | null, targetOrganizationId: string) {
  const orgIds = sourceOrganizationId ? [sourceOrganizationId, targetOrganizationId] : [targetOrganizationId];
  for (const organizationId of orgIds) {
    invalidateOrganizationSitesCache(organizationId);
  }
  const affectedMembers = await db.query.member.findMany({
    where: (m, { inArray }) => inArray(m.organizationId, orgIds),
    columns: { userId: true },
  });
  for (const { userId } of affectedMembers) {
    invalidateSitesAccessCache(userId);
  }
}
