import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/postgres/postgres.js";
import { dashboards } from "../../../db/postgres/schema.js";
import { parsePositiveInteger } from "../../utils/parseParams.js";

export async function deleteDashboard(
  request: FastifyRequest<{
    Params: {
      siteId: string;
      dashboardId: string;
    };
  }>,
  reply: FastifyReply
) {
  const siteId = parsePositiveInteger(request.params.siteId, reply, "Invalid site ID");
  if (siteId === null) return;
  const dashboardId = parsePositiveInteger(request.params.dashboardId, reply, "Invalid dashboard ID");
  if (dashboardId === null) return;

  try {
    const dashboardToDelete = await db.query.dashboards.findFirst({
      where: eq(dashboards.dashboardId, dashboardId),
    });

    if (!dashboardToDelete) {
      return reply.status(404).send({ error: "Dashboard not found" });
    }

    if (dashboardToDelete.siteId !== siteId) {
      return reply.status(403).send({ error: "Dashboard does not belong to the specified site" });
    }

    // Site access is enforced by the `authSite` (requireSiteAccess) preHandler.
    const result = await db
      .delete(dashboards)
      .where(eq(dashboards.dashboardId, dashboardId))
      .returning({ deleted: dashboards.dashboardId });

    if (!result || result.length === 0) {
      return reply.status(500).send({ error: "Failed to delete dashboard" });
    }

    return reply.send({ success: true });
  } catch (error) {
    console.error("Error deleting dashboard:", error);
    return reply.status(500).send({ error: "Failed to delete dashboard" });
  }
}
