import { and, eq, inArray, desc } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { DateTime } from "luxon";
import { db } from "../../db/postgres/postgres.js";
import { uptimeMonitors, uptimeMonitorStatus, member } from "../../db/postgres/schema.js";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getSessionFromReq } from "../../lib/auth-utils.js";
import { processResults } from "../analytics/utils/utils.js";
import { getMonitorsQuerySchema, type GetMonitorsQuery } from "./schemas.js";

interface GetMonitorsRequest {
  Querystring: GetMonitorsQuery;
}

export async function getMonitors(request: FastifyRequest<GetMonitorsRequest>, reply: FastifyReply) {
  const session = await getSessionFromReq(request);
  const userId = session?.user?.id;

  if (!userId) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  // Get user's organizations
  const userOrgs = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId));

  if (userOrgs.length === 0) {
    return reply.status(403).send({ error: "No organization access" });
  }

  try {
    // Validate query parameters with Zod
    const query = getMonitorsQuerySchema.parse(request.query);
    const { enabled, monitorType, organizationId, limit, offset } = query;

    // Build where conditions
    const orgIds = userOrgs.map(org => org.organizationId);
    const conditions = [];

    // Filter by specific organization if provided, otherwise all user's organizations
    if (organizationId) {
      // Check if user has access to the specified organization
      if (!orgIds.includes(organizationId)) {
        return reply.status(403).send({ error: "Access denied to organization" });
      }
      conditions.push(eq(uptimeMonitors.organizationId, organizationId));
    } else {
      // Use inArray for multiple orgs
      conditions.push(inArray(uptimeMonitors.organizationId, orgIds));
    }

    if (enabled !== undefined) {
      conditions.push(eq(uptimeMonitors.enabled, enabled));
    }

    if (monitorType) {
      conditions.push(eq(uptimeMonitors.monitorType, monitorType));
    }

    // Get monitors with their status
    const monitors = await db
      .select({
        monitor: uptimeMonitors,
        status: uptimeMonitorStatus,
      })
      .from(uptimeMonitors)
      .leftJoin(uptimeMonitorStatus, eq(uptimeMonitors.id, uptimeMonitorStatus.monitorId))
      .where(and(...conditions))
      .orderBy(desc(uptimeMonitors.createdAt))
      .limit(limit)
      .offset(offset);

    // Get monitor IDs for uptime calculations
    const monitorIds = monitors.map(m => m.monitor.id);

    // Calculate uptime percentages from ClickHouse if we have monitors
    let uptimeData: Record<number, { percentage24h: number; percentage7d: number; percentage30d: number }> = {};

    if (monitorIds.length > 0) {
      try {
        const now = DateTime.now();
        const periods = [
          { key: "24h", startTime: now.minus({ hours: 24 }).toFormat("yyyy-MM-dd HH:mm:ss") },
          { key: "7d", startTime: now.minus({ days: 7 }).toFormat("yyyy-MM-dd HH:mm:ss") },
          { key: "30d", startTime: now.minus({ days: 30 }).toFormat("yyyy-MM-dd HH:mm:ss") },
        ];

        // Run queries for each period
        const uptimeResults = await Promise.all(
          periods.map(async ({ key, startTime }) => {
            const query = `
              SELECT 
                monitor_id,
                countIf(status = 'success') as successful_checks,
                count() as total_checks
              FROM monitor_events
              WHERE monitor_id IN {monitorIds:Array(UInt32)}
                AND timestamp >= {startTime:String}
              GROUP BY monitor_id
            `;

            const result = await clickhouse.query({
              query,
              query_params: {
                monitorIds,
                startTime,
              },
              format: "JSONEachRow",
            });

            const data = await processResults<{
              monitor_id: number;
              successful_checks: number;
              total_checks: number;
            }>(result);

            return { key, data };
          })
        );

        // Organize results by monitor ID
        monitorIds.forEach(monitorId => {
          uptimeData[monitorId] = {
            percentage24h: 0,
            percentage7d: 0,
            percentage30d: 0,
          };
        });

        uptimeResults.forEach(({ key, data }) => {
          data.forEach(row => {
            const percentage = row.total_checks > 0 ? (row.successful_checks / row.total_checks) * 100 : 0;

            if (key === "24h") uptimeData[row.monitor_id].percentage24h = percentage;
            else if (key === "7d") uptimeData[row.monitor_id].percentage7d = percentage;
            else if (key === "30d") uptimeData[row.monitor_id].percentage30d = percentage;
          });
        });
      } catch (error) {
        console.error("Error calculating uptime percentages:", error);
        // Continue without uptime data rather than failing the entire request
      }
    }

    const result = monitors.map(row => ({
      ...row.monitor,
      status: row.status
        ? {
            ...row.status,
            uptimePercentage24h: uptimeData[row.monitor.id]?.percentage24h || null,
            uptimePercentage7d: uptimeData[row.monitor.id]?.percentage7d || null,
            uptimePercentage30d: uptimeData[row.monitor.id]?.percentage30d || null,
          }
        : null,
    }));

    return reply.status(200).send(result);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as any;
      return reply.status(400).send({
        error: "Validation error",
        details: zodError.errors,
      });
    }
    console.error("Error retrieving monitors:", error);
    return reply.status(500).send({ error: "Internal server error" });
  }
}
