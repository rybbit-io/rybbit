import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/postgres/postgres.js";
import { dashboards } from "../../../db/postgres/schema.js";

export async function getDashboard(
  request: FastifyRequest<{
    Params: {
      siteId: string;
      dashboardId: string;
    };
  }>,
  reply: FastifyReply
) {
  const siteId = parseInt(request.params.siteId, 10);
  const dashboardId = parseInt(request.params.dashboardId, 10);

  if (isNaN(siteId) || siteId <= 0) {
    return reply.status(400).send({ error: "Invalid site ID" });
  }
  if (isNaN(dashboardId) || dashboardId <= 0) {
    return reply.status(400).send({ error: "Invalid dashboard ID" });
  }

  try {
    const dashboard = await db.query.dashboards.findFirst({
      where: eq(dashboards.dashboardId, dashboardId),
    });

    if (!dashboard) {
      return reply.status(404).send({ error: "Dashboard not found" });
    }

    if (dashboard.siteId !== siteId) {
      return reply.status(403).send({ error: "Dashboard does not belong to the specified site" });
    }

    return reply.send(dashboard);
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    return reply.status(500).send({ error: "Failed to fetch dashboard" });
  }
}
