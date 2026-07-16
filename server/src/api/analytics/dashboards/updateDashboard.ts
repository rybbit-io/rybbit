import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../../../db/postgres/postgres.js";
import { dashboards } from "../../../db/postgres/schema.js";
import { updateDashboardSchema } from "./dashboardSchema.js";

export async function updateDashboard(
  request: FastifyRequest<{
    Params: { siteId: string; dashboardId: string };
    Body: unknown;
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
    const { name, config } = updateDashboardSchema.parse(request.body);

    const existing = await db.query.dashboards.findFirst({
      where: eq(dashboards.dashboardId, dashboardId),
    });

    if (!existing) {
      return reply.status(404).send({ error: "Dashboard not found" });
    }
    if (existing.siteId !== siteId) {
      return reply.status(403).send({ error: "Dashboard does not belong to the specified site" });
    }

    // Site access is enforced by the `authSite` (requireSiteAccess) preHandler.
    const result = await db
      .update(dashboards)
      .set({
        ...(name !== undefined ? { name } : {}),
        ...(config !== undefined ? { config } : {}),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(dashboards.dashboardId, dashboardId))
      .returning({ dashboardId: dashboards.dashboardId });

    if (!result || result.length === 0) {
      return reply.status(500).send({ error: "Failed to update dashboard" });
    }

    return reply.send({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: "Validation error", details: error.errors });
    }
    console.error("Error updating dashboard:", error);
    return reply.status(500).send({ error: "Failed to update dashboard" });
  }
}
