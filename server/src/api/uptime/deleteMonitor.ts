import { and, eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { uptimeMonitors, uptimeMonitorStatus, member } from "../../db/postgres/schema.js";
import { getSessionFromReq } from "../../lib/auth-utils.js";
import { uptimeService } from "../../services/uptime/uptimeService.js";

interface DeleteMonitorParams {
  Params: {
    monitorId: string;
  };
}

export async function deleteMonitor(request: FastifyRequest<DeleteMonitorParams>, reply: FastifyReply) {
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

    // Remove the monitor from the scheduler first
    await uptimeService.onMonitorDeleted(Number(monitorId));

    // Delete monitor and related records in a transaction
    await db.transaction(async (tx) => {
      // Delete monitor status first
      await tx.delete(uptimeMonitorStatus).where(eq(uptimeMonitorStatus.monitorId, Number(monitorId)));

      // Delete the monitor
      await tx.delete(uptimeMonitors).where(eq(uptimeMonitors.id, Number(monitorId)));
    });

    return reply.status(204).send();
  } catch (error) {
    console.error("Error deleting monitor:", error);
    return reply.status(500).send({ error: "Internal server error" });
  }
}
