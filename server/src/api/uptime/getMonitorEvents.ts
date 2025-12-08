import { and, eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { uptimeMonitors, member } from "../../db/postgres/schema.js";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getSessionFromReq } from "../../lib/auth-utils.js";
import { processResults } from "../analytics/utils/utils.js";
import { getMonitorEventsQuerySchema, type GetMonitorEventsQuery } from "./schemas.js";

interface GetMonitorEventsRequest {
  Params: {
    monitorId: string;
  };
  Querystring: GetMonitorEventsQuery;
}

export async function getMonitorEvents(request: FastifyRequest<GetMonitorEventsRequest>, reply: FastifyReply) {
  const session = await getSessionFromReq(request);
  const userId = session?.user?.id;
  const { monitorId } = request.params;

  if (!userId) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  try {
    // Validate query parameters with Zod
    const query = getMonitorEventsQuerySchema.parse(request.query);
    const { status, region, limit, offset } = query;
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

    // Build query for ClickHouse
    let queryStr = `
      SELECT 
        monitor_id,
        organization_id,
        timestamp,
        monitor_type,
        monitor_url,
        monitor_name,
        region,
        status,
        status_code,
        response_time_ms,
        dns_time_ms,
        tcp_time_ms,
        tls_time_ms,
        ttfb_ms,
        transfer_time_ms,
        validation_errors,
        response_headers,
        response_size_bytes,
        port,
        error_message,
        error_type
      FROM monitor_events
      WHERE monitor_id = {monitorId: UInt32}
    `;

    const queryParams: any = { monitorId: Number(monitorId) };

    if (status) {
      queryStr += ` AND status = {status: String}`;
      queryParams.status = status;
    }

    if (region) {
      queryStr += ` AND region = {region: String}`;
      queryParams.region = region;
    }

    queryStr += ` ORDER BY timestamp DESC`;
    queryStr += ` LIMIT {limit: UInt32} OFFSET {offset: UInt32}`;
    queryParams.limit = limit;
    queryParams.offset = offset;

    const result = await clickhouse.query({
      query: queryStr,
      query_params: queryParams,
      format: "JSONEachRow",
    });

    const events = await processResults(result);

    // Get total count
    let countQuery = `
      SELECT count() as total
      FROM monitor_events
      WHERE monitor_id = {monitorId: UInt32}
    `;

    const countParams: any = { monitorId: Number(monitorId) };

    if (status) {
      countQuery += ` AND status = {status: String}`;
      countParams.status = status;
    }

    if (region) {
      countQuery += ` AND region = {region: String}`;
      countParams.region = region;
    }

    const countResult = await clickhouse.query({
      query: countQuery,
      query_params: countParams,
      format: "JSONEachRow",
    });

    const countData = await processResults<{ total: number }>(countResult);
    const total = countData[0]?.total || 0;

    return reply.status(200).send({
      events,
      pagination: {
        total: Number(total),
        limit: limit,
        offset: offset,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as any;
      return reply.status(400).send({
        error: "Validation error",
        details: zodError.errors,
      });
    }
    console.error("Error retrieving monitor events:", error);
    return reply.status(500).send({ error: "Internal server error" });
  }
}
