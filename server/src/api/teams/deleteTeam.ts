import { eq, and } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { team, teamMember } from "../../db/postgres/schema.js";
import { invalidateSitesAccessCache } from "../../lib/auth-utils.js";

export async function deleteTeam(
  request: FastifyRequest<{
    Params: { organizationId: string; teamId: string };
  }>,
  reply: FastifyReply
) {
  const { organizationId, teamId } = request.params;

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

    // Get affected user IDs before deleting
    const affectedMembers = await db
      .select({ userId: teamMember.userId })
      .from(teamMember)
      .where(eq(teamMember.teamId, teamId));

    // Delete team (cascades to teamMember and teamSiteAccess)
    await db
      .delete(team)
      .where(and(eq(team.id, teamId), eq(team.organizationId, organizationId)));

    // Invalidate cache for affected users
    for (const m of affectedMembers) {
      invalidateSitesAccessCache(m.userId);
    }

    return reply.status(200).send({ success: true });
  } catch (error) {
    console.error("Error deleting team:", error);
    return reply.status(500).send({ error: "Failed to delete team" });
  }
}
