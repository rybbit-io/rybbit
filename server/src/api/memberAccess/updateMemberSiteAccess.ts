import { and, eq, inArray } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";

import { db } from "../../db/postgres/postgres.js";
import { member, memberSiteAccess, sites, user } from "../../db/postgres/schema.js";
import { invalidateSitesAccessCache } from "../../lib/auth-utils.js";

interface UpdateMemberSiteAccessParams {
  organizationId: string;
  memberId: string;
}

interface UpdateMemberSiteAccessBody {
  hasRestrictedSiteAccess: boolean;
  siteIds: number[];
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
  const currentUserId = request.user?.id;

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

    // Don't allow restricting admin or owner roles
    if (memberData.role === "admin" || memberData.role === "owner") {
      return reply.status(400).send({
        error: "Cannot restrict site access for admin or owner roles",
      });
    }

    // Validate that all siteIds belong to this organization
    if (siteIds && siteIds.length > 0) {
      const validSites = await db
        .select({ siteId: sites.siteId })
        .from(sites)
        .where(and(eq(sites.organizationId, organizationId), inArray(sites.siteId, siteIds)));

      const validSiteIds = new Set(validSites.map(s => s.siteId));
      const invalidSiteIds = siteIds.filter(id => !validSiteIds.has(id));

      if (invalidSiteIds.length > 0) {
        return reply.status(400).send({
          error: `Invalid site IDs: ${invalidSiteIds.join(", ")}. Sites must belong to this organization.`,
        });
      }
    }

    // Update member's hasRestrictedSiteAccess flag
    await db
      .update(member)
      .set({ hasRestrictedSiteAccess })
      .where(eq(member.id, memberId));

    // Delete existing site access entries
    await db.delete(memberSiteAccess).where(eq(memberSiteAccess.memberId, memberId));

    // Insert new site access entries if restricted and has site IDs
    if (hasRestrictedSiteAccess && siteIds && siteIds.length > 0) {
      await db.insert(memberSiteAccess).values(
        siteIds.map(siteId => ({
          memberId: memberId,
          siteId: siteId,
          createdBy: currentUserId || null,
        }))
      );
    }

    // Invalidate the cache for this user
    invalidateSitesAccessCache(memberData.userId);

    // Fetch the updated site access
    const updatedSiteAccess = await db
      .select({
        siteId: memberSiteAccess.siteId,
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
        name: record.siteName,
        domain: record.siteDomain,
      })),
    });
  } catch (error) {
    console.error("Error updating member site access:", error);
    return reply.status(500).send({ error: "Failed to update member site access" });
  }
}
