import { and, eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";

import { db } from "../../db/postgres/postgres.js";
import { invitation, sites } from "../../db/postgres/schema.js";

interface UpdateInvitationSiteAccessParams {
  organizationId: string;
  invitationId: string;
}

interface UpdateInvitationSiteAccessBody {
  hasRestrictedSiteAccess: boolean;
  siteIds: number[];
}

export async function updateInvitationSiteAccess(
  request: FastifyRequest<{
    Params: UpdateInvitationSiteAccessParams;
    Body: UpdateInvitationSiteAccessBody;
  }>,
  reply: FastifyReply
) {
  const { organizationId, invitationId } = request.params;
  const { hasRestrictedSiteAccess, siteIds } = request.body;

  try {
    // Verify the invitation exists and belongs to this organization
    const invitationRecord = await db
      .select()
      .from(invitation)
      .where(and(eq(invitation.id, invitationId), eq(invitation.organizationId, organizationId)))
      .limit(1);

    if (invitationRecord.length === 0) {
      return reply.status(404).send({ error: "Invitation not found" });
    }

    // Validate that all siteIds belong to this organization
    if (siteIds && siteIds.length > 0) {
      const validSites = await db
        .select({ siteId: sites.siteId })
        .from(sites)
        .where(eq(sites.organizationId, organizationId));

      const validSiteIds = new Set(validSites.map(s => s.siteId));
      const invalidSiteIds = siteIds.filter(id => !validSiteIds.has(id));

      if (invalidSiteIds.length > 0) {
        return reply.status(400).send({
          error: `Invalid site IDs: ${invalidSiteIds.join(", ")}. Sites must belong to this organization.`,
        });
      }
    }

    // Update the invitation with site access info
    await db
      .update(invitation)
      .set({
        hasRestrictedSiteAccess,
        siteIds: siteIds || [],
      })
      .where(eq(invitation.id, invitationId));

    return reply.status(200).send({
      success: true,
      invitationId,
      hasRestrictedSiteAccess,
      siteIds,
    });
  } catch (error) {
    console.error("Error updating invitation site access:", error);
    return reply.status(500).send({ error: "Failed to update invitation site access" });
  }
}
