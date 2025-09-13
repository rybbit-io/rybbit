import { and, eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { uptimeMonitors, member } from "../../db/postgres/schema.js";
import { getSessionFromReq } from "../../lib/auth-utils.js";
import { uptimeService } from "../../services/uptime/uptimeService.js";
import { updateMonitorSchema, type UpdateMonitorInput } from "./schemas.js";

interface UpdateMonitorRequest {
  Params: {
    monitorId: string;
  };
  Body: UpdateMonitorInput;
}

export async function updateMonitor(request: FastifyRequest<UpdateMonitorRequest>, reply: FastifyReply) {
  const session = await getSessionFromReq(request);
  const userId = session?.user?.id;
  const { monitorId } = request.params;

  if (!userId) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  try {
    // First get the monitor to check if it exists and user has access
    const existingMonitor = await db.query.uptimeMonitors.findFirst({
      where: eq(uptimeMonitors.id, Number(monitorId)),
    });

    if (!existingMonitor) {
      return reply.status(404).send({ error: "Monitor not found" });
    }

    // Check if user has access to the monitor's organization
    const userHasAccess = await db.query.member.findFirst({
      where: and(eq(member.userId, userId), eq(member.organizationId, existingMonitor.organizationId)),
    });

    if (!userHasAccess) {
      return reply.status(403).send({ error: "Access denied" });
    }

    // Validate request body with Zod
    const updateData = updateMonitorSchema.parse(request.body);

    // Additional validation for monitor type specific config if changing config
    if (existingMonitor.monitorType === "http" && updateData.httpConfig) {
      if (!updateData.httpConfig.url) {
        return reply.status(400).send({ error: "HTTP monitor requires URL" });
      }
    }
    if (existingMonitor.monitorType === "tcp" && updateData.tcpConfig) {
      if (!updateData.tcpConfig.host || !updateData.tcpConfig.port) {
        return reply.status(400).send({ error: "TCP monitor requires host and port" });
      }
    }

    // Update the monitor
    const [updatedMonitor] = await db
      .update(uptimeMonitors)
      .set({
        ...updateData,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(uptimeMonitors.id, Number(monitorId)))
      .returning();

    // Update the monitor schedule if interval or enabled status changed
    const intervalChanged =
      updateData.intervalSeconds !== undefined && updateData.intervalSeconds !== existingMonitor.intervalSeconds;
    const enabledChanged = updateData.enabled !== undefined && updateData.enabled !== existingMonitor.enabled;

    if (intervalChanged || enabledChanged) {
      const enabled = updateData.enabled !== undefined ? updateData.enabled : existingMonitor.enabled!;
      const intervalSeconds = updateData.intervalSeconds || existingMonitor.intervalSeconds;

      await uptimeService.onMonitorUpdated(Number(monitorId), intervalSeconds, enabled);
    }

    return reply.status(200).send(updatedMonitor);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as any;
      return reply.status(400).send({
        error: "Validation error",
        details: zodError.errors,
      });
    }
    console.error("Error updating monitor:", error);
    return reply.status(500).send({ error: "Internal server error" });
  }
}
