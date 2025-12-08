import { and, eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { uptimeMonitors, uptimeMonitorStatus, member } from "../../db/postgres/schema.js";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getSessionFromReq } from "../../lib/auth-utils.js";
import { processResults } from "../analytics/utils/utils.js";

interface GetMonitorStatusRequest {
  Params: {
    monitorId: string;
  };
}

export async function getMonitorStatus(request: FastifyRequest<GetMonitorStatusRequest>, reply: FastifyReply) {
  const session = await getSessionFromReq(request);
  const userId = session?.user?.id;
  const { monitorId } = request.params;

  if (!userId) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  try {
    // First check if monitor exists and user has access
    const monitor = await db.query.uptimeMonitors.findFirst({
      where: eq(uptimeMonitors.id, Number(monitorId)),
    });

    if (!monitor) {
      return reply.status(404).send({ error: "Monitor not found" });
    }

    // Check if user has access to the monitor's organization
    const userHasAccess = await db.query.member.findFirst({
      where: and(eq(member.userId, userId), eq(member.organizationId, monitor.organizationId)),
    });

    if (!userHasAccess) {
      return reply.status(403).send({ error: "Access denied" });
    }

    // Get current status from PostgreSQL
    const currentStatus = await db.query.uptimeMonitorStatus.findFirst({
      where: eq(uptimeMonitorStatus.monitorId, Number(monitorId)),
    });

    // Get recent incidents from ClickHouse
    const incidentsQuery = `
      WITH incidents AS (
        SELECT 
          timestamp,
          status,
          error_message,
          error_type,
          response_time_ms,
          status_code,
          LAG(status) OVER (ORDER BY timestamp) as prev_status,
          LEAD(status) OVER (ORDER BY timestamp) as next_status
        FROM monitor_events
        WHERE monitor_id = {monitorId: UInt32}
          AND timestamp >= now() - INTERVAL 7 DAY
        ORDER BY timestamp DESC
      )
      SELECT 
        timestamp as incident_start,
        status,
        error_message,
        error_type,
        response_time_ms,
        status_code,
        CASE 
          WHEN next_status = 'success' THEN 
            LEAD(timestamp) OVER (ORDER BY timestamp)
          ELSE NULL 
        END as incident_end
      FROM incidents
      WHERE status != 'success' 
        AND (prev_status = 'success' OR prev_status IS NULL)
      ORDER BY timestamp DESC
      LIMIT 10
    `;

    const incidentsResult = await clickhouse.query({
      query: incidentsQuery,
      query_params: {
        monitorId: Number(monitorId),
      },
      format: "JSONEachRow",
    });

    const recentIncidents = await processResults(incidentsResult);

    // Get last 5 checks
    const recentChecksQuery = `
      SELECT 
        timestamp,
        status,
        response_time_ms,
        status_code,
        error_message,
        validation_errors
      FROM monitor_events
      WHERE monitor_id = {monitorId: UInt32}
      ORDER BY timestamp DESC
      LIMIT 5
    `;

    const recentChecksResult = await clickhouse.query({
      query: recentChecksQuery,
      query_params: {
        monitorId: Number(monitorId),
      },
      format: "JSONEachRow",
    });

    const recentChecks = await processResults(recentChecksResult);

    return reply.status(200).send({
      monitorId: Number(monitorId),
      currentStatus: currentStatus || {
        currentStatus: "unknown",
        lastCheckedAt: null,
        nextCheckAt: null,
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
      },
      recentIncidents,
      recentChecks,
    });
  } catch (error) {
    console.error("Error retrieving monitor status:", error);
    return reply.status(500).send({ error: "Internal server error" });
  }
}
