import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/postgres/postgres.js";
import { funnels as funnelsTable } from "../../../db/postgres/schema.js";
import { getUserHasAccessToSite } from "../../../lib/auth-utils.js";

export async function deleteFunnel(
  request: FastifyRequest<{
    Params: {
      siteId: string;
      funnelId: string;
    };
  }>,
  reply: FastifyReply
) {
  const { siteId, funnelId } = request.params;
  const parsedSiteId = parseInt(siteId, 10);
  const parsedFunnelId = parseInt(funnelId, 10);

  if (isNaN(parsedSiteId) || parsedSiteId <= 0) {
    return reply.status(400).send({ error: "Invalid site ID" });
  }

  if (isNaN(parsedFunnelId) || parsedFunnelId <= 0) {
    return reply.status(400).send({ error: "Invalid funnel ID" });
  }

  try {
    // First get the funnel to check ownership
    const funnel = await db.query.funnels.findFirst({
      where: eq(funnelsTable.reportId, parsedFunnelId),
    });

    if (!funnel) {
      return reply.status(404).send({ error: "Funnel not found" });
    }

    if (!funnel.siteId) {
      return reply.status(400).send({ error: "Invalid funnel: missing site ID" });
    }

    if (funnel.siteId !== parsedSiteId) {
      return reply.status(403).send({ error: "Funnel does not belong to the specified site" });
    }

    // Check user access to site
    const userHasAccessToSite = await getUserHasAccessToSite(request, parsedSiteId.toString());
    if (!userHasAccessToSite) {
      return reply.status(403).send({ error: "Forbidden" });
    }

    // Delete the funnel
    await db.delete(funnelsTable).where(eq(funnelsTable.reportId, parsedFunnelId));

    return reply.status(200).send({ success: true });
  } catch (error) {
    request.log.error({ err: error }, "Error deleting funnel");
    return reply.status(500).send({ error: "Failed to delete funnel" });
  }
}
