import { eq, and } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { team } from "../../db/postgres/schema.js";
import { invalidateOrganizationSitesAccessCache } from "../../services/sites/siteAccessCache.js";

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

    // Delete team (cascades to teamMember and teamSiteAccess)
    await db.delete(team).where(and(eq(team.id, teamId), eq(team.organizationId, organizationId)));

    await invalidateOrganizationSitesAccessCache(organizationId);

    return reply.status(200).send({ success: true });
  } catch (error) {
    request.log.error({ err: error }, "Error deleting team");
    return reply.status(500).send({ error: "Failed to delete team" });
  }
}
