import { and, eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { uptimeMonitors, member } from "../../db/postgres/schema.js";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getSessionFromReq } from "../../lib/auth-utils.js";
import { processResults } from "../analytics/utils/utils.js";

interface GetMonitorUptimeRequest {
  Params: {
    monitorId: string;
  };
}

export async function getMonitorUptime(request: FastifyRequest<GetMonitorUptimeRequest>, reply: FastifyReply) {
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

    // Get the first check event to determine when monitoring started
    const firstCheckQuery = `
      SELECT 
        min(timestamp) as first_check,
        max(timestamp) as last_check
      FROM monitor_events
      WHERE monitor_id = {monitorId: UInt32}
    `;

    const firstCheckResult = await clickhouse.query({
      query: firstCheckQuery,
      query_params: {
        monitorId: Number(monitorId),
      },
      format: "JSONEachRow",
    });

    const firstCheckData = await processResults<{
      first_check: string;
      last_check: string;
    }>(firstCheckResult);

    if (!firstCheckData[0]?.first_check) {
      return reply.status(200).send({
        monitorId: Number(monitorId),
        totalUptimeSeconds: 0,
        currentUptimeSeconds: 0,
        lastDowntime: null,
        monitoringSince: null,
        lastCheck: null,
      });
    }

    const { first_check, last_check } = firstCheckData[0];

    // Get the most recent downtime event
    const lastDowntimeQuery = `
      SELECT 
        timestamp as downtime_start,
        error_message,
        error_type,
        status
      FROM monitor_events
      WHERE monitor_id = {monitorId: UInt32}
        AND status != 'success'
      ORDER BY timestamp DESC
      LIMIT 1
    `;

    const lastDowntimeResult = await clickhouse.query({
      query: lastDowntimeQuery,
      query_params: {
        monitorId: Number(monitorId),
      },
      format: "JSONEachRow",
    });

    const lastDowntimeData = await processResults<{
      downtime_start: string;
      error_message?: string;
      error_type?: string;
      status: string;
    }>(lastDowntimeResult);

    const lastDowntime = lastDowntimeData[0] || null;

    // Calculate total monitoring duration
    const monitoringStartMs = new Date(first_check).getTime();
    const lastCheckMs = new Date(last_check).getTime();
    const totalMonitoringSeconds = Math.floor((lastCheckMs - monitoringStartMs) / 1000);

    // Calculate current uptime (time since last downtime or since monitoring started)
    let currentUptimeSeconds = totalMonitoringSeconds;
    if (lastDowntime) {
      const lastDowntimeMs = new Date(lastDowntime.downtime_start).getTime();
      // Only count as current uptime if the downtime was after monitoring started
      if (lastDowntimeMs > monitoringStartMs) {
        currentUptimeSeconds = Math.floor((lastCheckMs - lastDowntimeMs) / 1000);
      }
    }

    // Get total downtime duration for accurate total uptime calculation
    const downtimeStatsQuery = `
      SELECT 
        countIf(status != 'success') as total_downtime_checks,
        countIf(status = 'success') as total_uptime_checks,
        count() as total_checks,
        avg(if(status = 'success', 0, 1)) * 100 as downtime_percentage
      FROM monitor_events
      WHERE monitor_id = {monitorId: UInt32}
    `;

    const downtimeStatsResult = await clickhouse.query({
      query: downtimeStatsQuery,
      query_params: {
        monitorId: Number(monitorId),
      },
      format: "JSONEachRow",
    });

    const downtimeStats = await processResults<{
      total_downtime_checks: number;
      total_uptime_checks: number;
      total_checks: number;
      downtime_percentage: number;
    }>(downtimeStatsResult);

    const stats = downtimeStats[0] || {
      total_downtime_checks: 0,
      total_uptime_checks: 0,
      total_checks: 0,
      downtime_percentage: 0,
    };

    // Calculate estimated total uptime based on check intervals
    // This is an approximation since we don't store exact downtime durations
    const avgCheckInterval = monitor.intervalSeconds;
    const estimatedTotalDowntimeSeconds = stats.total_downtime_checks * avgCheckInterval;
    const estimatedTotalUptimeSeconds = Math.max(0, totalMonitoringSeconds - estimatedTotalDowntimeSeconds);

    return reply.status(200).send({
      monitorId: Number(monitorId),
      totalUptimeSeconds: estimatedTotalUptimeSeconds,
      currentUptimeSeconds,
      totalMonitoringSeconds,
      lastDowntime: lastDowntime
        ? {
            timestamp: lastDowntime.downtime_start,
            error: lastDowntime.error_message,
            errorType: lastDowntime.error_type,
            status: lastDowntime.status,
          }
        : null,
      monitoringSince: first_check,
      lastCheck: last_check,
      uptimePercentage: 100 - stats.downtime_percentage,
      totalChecks: stats.total_checks,
      failedChecks: stats.total_downtime_checks,
    });
  } catch (error) {
    console.error("Error retrieving monitor uptime:", error);
    return reply.status(500).send({ error: "Internal server error" });
  }
}
