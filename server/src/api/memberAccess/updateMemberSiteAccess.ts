import { isAdminRole, isSiteGrantRole, SITE_GRANT_ROLES } from "@rybbit/shared";
import { and, eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";

import { db } from "../../db/postgres/postgres.js";
import { member, memberSiteAccess, sites, user } from "../../db/postgres/schema.js";
import { grantRoleForRewrite, siteIdsInOrganization } from "../../lib/access.js";
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
    const memberRecord = await db
      .select({
        id: member.id,
        userId: member.userId,
        role: member.role,
        organizationId: member.organizationId,
      })
      .from(member)
      .where(and(eq(member.id, memberId), eq(member.organizationId, organizationId)))
      .limit(1);

    if (memberRecord.length === 0) {
      return reply.status(404).send({ error: "Member not found" });
    }

    const memberData = memberRecord[0];

    // Admins and owners reach every site: they can't be restricted, but a
    // restriction left over from before a promotion can be cleared.
    if (isAdminRole(memberData.role) && hasRestrictedSiteAccess) {
      return reply.status(400).send({
        error: "Cannot restrict site access for admin or owner roles",
      });
    }

    // Validate that all siteIds belong to this organization
    if (siteIds && siteIds.length > 0) {
      const validSiteIds = new Set(await siteIdsInOrganization(siteIds, organizationId));
      const invalidSiteIds = siteIds.filter(id => !validSiteIds.has(id));

      if (invalidSiteIds.length > 0) {
        return reply.status(400).send({
          error: `Invalid site IDs: ${invalidSiteIds.join(", ")}. Sites must belong to this organization.`,
        });
      }
    }

    await db.transaction(async tx => {
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
    request.log.error({ err: error }, "Error updating member site access");
    return reply.status(500).send({ error: "Failed to update member site access" });
  }
}
