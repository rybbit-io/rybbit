import { and, eq, sql } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/postgres/postgres.js";
import { funnels as funnelsTable, projectFunnels, projects } from "../../../db/postgres/schema.js";
import { getUserHasAccessToSite } from "../../../lib/auth-utils.js";

export async function deleteFunnel(
  request: FastifyRequest<{
    Params: {
      funnelId: string;
    };
  }>,
  reply: FastifyReply
) {
  const { funnelId } = request.params;

  try {
    // Check if this is a v1 funnel (prefixed with "v1_")
    if (funnelId.startsWith("v1_")) {
      // Extract the real funnel ID without the prefix
      const realFunnelId = funnelId.substring(3);

      // Get the v1 funnel to check ownership
      const [funnel] = await db
        .select({
          id: projectFunnels.id,
          projectId: projectFunnels.projectId,
          siteId: sql<string>`${projects.metadata}->>'siteId'`,
        })
        .from(projectFunnels)
        .innerJoin(projects, eq(projectFunnels.projectId, projects.id))
        .where(eq(projectFunnels.id, realFunnelId))
        .limit(1);

      if (!funnel) {
        return reply.status(404).send({ error: "Funnel not found" });
      }

      if (!funnel.siteId) {
        return reply.status(400).send({ error: "Invalid funnel: missing site ID" });
      }

      // Check user access to site
      const userHasAccessToSite = await getUserHasAccessToSite(request, funnel.siteId);
      if (!userHasAccessToSite) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      // Delete the v1 funnel (steps will be cascade deleted)
      const deleted = await db
        .delete(projectFunnels)
        .where(eq(projectFunnels.id, realFunnelId))
        .returning({ id: projectFunnels.id });

      if (!deleted.length) {
        return reply.status(404).send({ error: "Funnel not found" });
      }

      return reply.status(200).send({ success: true });
    }

    // Handle legacy funnels (original code)
    const funnel = await db.query.funnels.findFirst({
      where: eq(funnelsTable.reportId, parseInt(funnelId)),
    });

    if (!funnel) {
      return reply.status(404).send({ error: "Funnel not found" });
    }

    if (!funnel.siteId) {
      return reply.status(400).send({ error: "Invalid funnel: missing site ID" });
    }

    // Check user access to site
    const userHasAccessToSite = await getUserHasAccessToSite(request, funnel.siteId.toString());
    if (!userHasAccessToSite) {
      return reply.status(403).send({ error: "Forbidden" });
    }

    // Delete the funnel
    await db.delete(funnelsTable).where(eq(funnelsTable.reportId, parseInt(funnelId)));

    return reply.status(200).send({ success: true });
  } catch (error) {
    console.error("Error deleting funnel:", error);
    return reply.status(500).send({ error: "Failed to delete funnel" });
  }
}
