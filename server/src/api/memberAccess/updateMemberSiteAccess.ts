import { isAdminRole, isSiteGrantRole, SITE_GRANT_ROLES } from "@rybbit/shared";
import { and, eq, inArray } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";

import { db } from "../../db/postgres/postgres.js";
import { member, memberSiteAccess, sites } from "../../db/postgres/schema.js";
import { grantRoleForRewrite } from "../../lib/access.js";
import { invalidateSitesAccessCache } from "../../lib/auth-utils.js";

interface UpdateMemberSiteAccessParams {
  organizationId: string;
  memberId: string;
}

interface UpdateMemberSiteAccessBody {
  hasRestrictedSiteAccess: boolean;
  siteIds: number[];
  /** Role on the granted sites (editor, member or viewer); null for none; omit to keep what the grants carry. */
  siteRole?: string | null;
}

class SiteAccessError extends Error {
  constructor(
    readonly statusCode: number,
    message: string
  ) {
    super(message);
  }
}

export async function updateMemberSiteAccess(
  request: FastifyRequest<{
    Params: UpdateMemberSiteAccessParams;
    Body: UpdateMemberSiteAccessBody;
  }>,
  reply: FastifyReply
) {
  const { organizationId, memberId } = request.params;
  const { hasRestrictedSiteAccess, siteIds } = request.body;
  const requestedSiteRole = request.body.siteRole;
  const currentUserId = request.user?.id;

  if (requestedSiteRole != null && !isSiteGrantRole(requestedSiteRole)) {
    return reply.status(400).send({ error: `siteRole must be one of: ${SITE_GRANT_ROLES.join(", ")}` });
  }

  try {
    // Get the member record
    const memberData = await db.transaction(async tx => {
      const memberRecord = await tx
        .select({
          id: member.id,
          userId: member.userId,
          role: member.role,
          organizationId: member.organizationId,
        })
        .from(member)
        .where(and(eq(member.id, memberId), eq(member.organizationId, organizationId)))
        .limit(1)
        .for("update");

      if (memberRecord.length === 0) {
        throw new SiteAccessError(404, "Member not found");
      }

      const memberData = memberRecord[0];

      // Admins and owners reach every site: they can't be restricted, but a
      // restriction left over from before a promotion can be cleared.
      if (isAdminRole(memberData.role) && hasRestrictedSiteAccess) {
        throw new SiteAccessError(400, "Cannot restrict site access for admin or owner roles");
      }

      // Validate that all siteIds belong to this organization
      if (siteIds && siteIds.length > 0) {
        // Keep ownership stable until the grants have been written.
        const ownedSites = await tx
          .select({ siteId: sites.siteId })
          .from(sites)
          .where(and(eq(sites.organizationId, organizationId), inArray(sites.siteId, siteIds)))
          .for("share");
        const validSiteIds = new Set(ownedSites.map(site => site.siteId));
        const invalidSiteIds = siteIds.filter(id => !validSiteIds.has(id));

        if (invalidSiteIds.length > 0) {
          throw new SiteAccessError(
            400,
            `Invalid site IDs: ${invalidSiteIds.join(", ")}. Sites must belong to this organization.`
          );
        }
      }

      const roleFor = await grantRoleForRewrite(tx, memberId, requestedSiteRole);
      await tx.update(member).set({ hasRestrictedSiteAccess }).where(eq(member.id, memberId));
      await tx.delete(memberSiteAccess).where(eq(memberSiteAccess.memberId, memberId));

      if (hasRestrictedSiteAccess && siteIds && siteIds.length > 0) {
        await tx.insert(memberSiteAccess).values(
          siteIds.map(siteId => ({
            memberId,
            siteId,
            role: roleFor(siteId),
            createdBy: currentUserId || null,
          }))
        );
      }
      return memberData;
    });

    // Invalidate the cache for this user
    invalidateSitesAccessCache(memberData.userId);

    // Fetch the updated site access
    const updatedSiteAccess = await db
      .select({
        siteId: memberSiteAccess.siteId,
        role: memberSiteAccess.role,
        siteName: sites.name,
        siteDomain: sites.domain,
      })
      .from(memberSiteAccess)
      .innerJoin(sites, eq(memberSiteAccess.siteId, sites.siteId))
      .where(eq(memberSiteAccess.memberId, memberId));

    return reply.status(200).send({
      memberId: memberId,
      hasRestrictedSiteAccess,
      siteAccess: updatedSiteAccess.map(record => ({
        siteId: record.siteId,
        role: record.role,
        name: record.siteName,
        domain: record.siteDomain,
      })),
    });
  } catch (error) {
    if (error instanceof SiteAccessError) return reply.status(error.statusCode).send({ error: error.message });
    request.log.error({ err: error }, "Error updating member site access");
    return reply.status(500).send({ error: "Failed to update member site access" });
  }
}
