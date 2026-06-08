import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/postgres/postgres.js";
import { dashboards } from "../../../db/postgres/schema.js";
import { parsePositiveInteger } from "../../utils/parseParams.js";

export async function getDashboard(
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
