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
import { usageService } from "../../services/usageService.js";

/**
 * Lock a site's row for the rest of the transaction and read the organization
 * it is in now. Anything that authorizes a change of ownership (moving it,
 * handing it over) must check the caller against this organization, under
 * this lock — authorization done before it can be overtaken by a concurrent
 * move. Lock order everywhere: organization row, then site row, then transfer
 * rows.
 */
export async function lockSiteOwnership(
  tx: SiteTransaction,
  siteId: number
): Promise<{ organizationId: string | null; domain: string } | null> {
  const [site] = await tx
    .select({ organizationId: sites.organizationId, domain: sites.domain })
    .from(sites)
    .where(eq(sites.siteId, siteId))
    .limit(1)
    .for("update");
  return site ?? null;
}

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
  // The moved site now follows the target organization's plan. Refreshing the source too marks
  // it as newer than any cron run already holding the old ownership, which would otherwise
  // re-apply the source organization's blocks to the moved site.
  usageService.requestOrganizationRefresh(targetOrganizationId);
  usageService.requestOrganizationRefresh(sourceOrganizationId);
}
