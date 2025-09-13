import { and, eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { uptimeMonitors, uptimeMonitorStatus, member } from "../../db/postgres/schema.js";
import { getSessionFromReq } from "../../lib/auth-utils.js";

interface GetMonitorParams {
  Params: {
    monitorId: string;
  };
}

export async function getMonitor(
  request: FastifyRequest<GetMonitorParams>,
  reply: FastifyReply
) {
  const session = await getSessionFromReq(request);
  const userId = session?.user?.id;
  const { monitorId } = request.params;

  if (!userId) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  try {
    // First get the monitor
    const monitor = await db.query.uptimeMonitors.findFirst({
      where: eq(uptimeMonitors.id, Number(monitorId)),
    });

    if (!monitor) {
      return reply.status(404).send({ error: "Monitor not found" });
    }

    // Check if user has access to the monitor's organization
    const userHasAccess = await db.query.member.findFirst({
      where: and(
        eq(member.userId, userId),
        eq(member.organizationId, monitor.organizationId)
      ),
    });

    if (!userHasAccess) {
      return reply.status(403).send({ error: "Access denied" });
    }

    // Get monitor with status
    const result = await db
      .select({
        monitor: uptimeMonitors,
        status: uptimeMonitorStatus,
      })
      .from(uptimeMonitors)
      .leftJoin(uptimeMonitorStatus, eq(uptimeMonitors.id, uptimeMonitorStatus.monitorId))
      .where(eq(uptimeMonitors.id, Number(monitorId)))
      .limit(1);

    const monitorWithStatus = {
      ...result[0].monitor,
      status: result[0].status,
    };

    return reply.status(200).send(monitorWithStatus);
  } catch (error) {
    console.error("Error retrieving monitor:", error);
    return reply.status(500).send({ error: "Internal server error" });
  }
}