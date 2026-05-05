import { eq, and, inArray } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import {
  team,
  teamMember,
  teamSiteAccess,
  member,
  sites,
} from "../../db/postgres/schema.js";
import { invalidateSitesAccessCache } from "../../lib/auth-utils.js";

interface UpdateTeamBody {
  name?: string;
  memberUserIds?: string[];
  siteIds?: number[];
}

export async function updateTeam(
  request: FastifyRequest<{
    Params: { organizationId: string; teamId: string };
    Body: UpdateTeamBody;
  }>,
  reply: FastifyReply
) {
  const { organizationId, teamId } = request.params;
  const { name, memberUserIds, siteIds } = request.body;

  try {
    // Verify team belongs to org
    const teamRecord = await db
      .select()
      .from(team)
      .where(and(eq(team.id, teamId), eq(team.organizationId, organizationId)))
      .limit(1);

    if (teamRecord.length === 0) {
      return reply.status(404).send({ error: "Team not found" });
    }

    // Get existing members before update (for cache invalidation)
    const existingMembers = await db
      .select({ userId: teamMember.userId })
      .from(teamMember)
      .where(eq(teamMember.teamId, teamId));
    const existingUserIds = existingMembers.map((m) => m.userId);

    // Validate memberUserIds are org members
    if (memberUserIds && memberUserIds.length > 0) {
      const orgMembers = await db
        .select({ userId: member.userId })
        .from(member)
        .where(
          and(
            eq(member.organizationId, organizationId),
            inArray(member.userId, memberUserIds)
          )
        );
      const validUserIds = new Set(orgMembers.map((m) => m.userId));
      const invalidUserIds = memberUserIds.filter((id) => !validUserIds.has(id));
      if (invalidUserIds.length > 0) {
        return reply.status(400).send({
          error: `Users not in organization: ${invalidUserIds.join(", ")}`,
        });
      }
    }

    // Validate siteIds belong to org
    if (siteIds && siteIds.length > 0) {
      const orgSites = await db
        .select({ siteId: sites.siteId })
        .from(sites)
        .where(
          and(
            eq(sites.organizationId, organizationId),
            inArray(sites.siteId, siteIds)
          )
        );
      const validSiteIds = new Set(orgSites.map((s) => s.siteId));
      const invalidSiteIds = siteIds.filter((id) => !validSiteIds.has(id));
      if (invalidSiteIds.length > 0) {
        return reply.status(400).send({
          error: `Sites not in organization: ${invalidSiteIds.join(", ")}`,
        });
      }
    }

    const now = new Date().toISOString();

    await db.transaction(async (tx) => {
      // Update team name
      const updates: Record<string, string> = { updatedAt: now };
      if (name !== undefined) {
        updates.name = name.trim();
      }
      await tx.update(team).set(updates).where(eq(team.id, teamId));

      // Replace members if provided
      if (memberUserIds !== undefined) {
        await tx.delete(teamMember).where(eq(teamMember.teamId, teamId));
        if (memberUserIds.length > 0) {
          await tx.insert(teamMember).values(
            memberUserIds.map((userId) => ({
              id: crypto.randomUUID(),
              teamId,
              userId,
              createdAt: now,
            }))
          );
        }
      }

      // Replace sites if provided
      if (siteIds !== undefined) {
        await tx
          .delete(teamSiteAccess)
          .where(eq(teamSiteAccess.teamId, teamId));
        if (siteIds.length > 0) {
          await tx.insert(teamSiteAccess).values(
            siteIds.map((siteId) => ({
              teamId,
              siteId,
            }))
          );
        }
      }
    });

    // Invalidate cache for all affected users (old + new members)
    const allAffectedUserIds = new Set([
      ...existingUserIds,
      ...(memberUserIds || []),
    ]);
    for (const userId of allAffectedUserIds) {
      invalidateSitesAccessCache(userId);
    }

    return reply.status(200).send({ success: true });
  } catch (error) {
    console.error("Error updating team:", error);
    return reply.status(500).send({ error: "Failed to update team" });
  }
}
