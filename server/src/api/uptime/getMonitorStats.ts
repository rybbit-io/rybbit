import { and, eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { db } from "../../db/postgres/postgres.js";
import { member, uptimeMonitors } from "../../db/postgres/schema.js";
import { getSessionFromReq } from "../../lib/auth-utils.js";
import { processResults, TimeBucketToFn } from "../analytics/utils/utils.js";
import { getMonitorStatsQuerySchema, type GetMonitorStatsQuery } from "./schemas.js";
import { DateTime } from "luxon";

interface GetMonitorStatsRequest {
  Params: {
    monitorId: string;
  };
  Querystring: GetMonitorStatsQuery;
}

export async function getMonitorStats(request: FastifyRequest<GetMonitorStatsRequest>, reply: FastifyReply) {
  const session = await getSessionFromReq(request);
  const userId = session?.user?.id;
  const { monitorId } = request.params;

  if (!userId) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  try {
    // Validate query parameters with Zod
    const query = getMonitorStatsQuerySchema.parse(request.query);
    const { region, hours } = query;
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

    // Get aggregated stats from ClickHouse
    let statsQuery = `
      SELECT 
        count() as total_checks,
        countIf(status = 'success') as successful_checks,
        countIf(status = 'failure') as failed_checks,
        countIf(status = 'timeout') as timeout_checks,
        avg(response_time_ms) as avg_response_time,
        min(response_time_ms) as min_response_time,
        max(response_time_ms) as max_response_time,
        quantile(0.5)(response_time_ms) as p50_response_time,
        quantile(0.75)(response_time_ms) as p75_response_time,
        quantile(0.90)(response_time_ms) as p90_response_time,
        quantile(0.95)(response_time_ms) as p95_response_time,
        quantile(0.99)(response_time_ms) as p99_response_time,
        100 * countIf(status = 'success') / count() as uptime_percentage
      FROM monitor_events
      WHERE monitor_id = {monitorId: UInt32}
        AND timestamp >= now() - INTERVAL {hours: UInt32} HOUR
    `;

    const queryParams: any = {
      monitorId: Number(monitorId),
      hours: hours || 24,
    };

    if (region) {
      statsQuery += ` AND region = {region: String}`;
      queryParams.region = region;
    }

    const statsResult = await clickhouse.query({
      query: statsQuery,
      query_params: queryParams,
      format: "JSONEachRow",
    });

    const statsData = await processResults<{
      total_checks: number;
      successful_checks: number;
      failed_checks: number;
      timeout_checks: number;
      avg_response_time: number;
      min_response_time: number;
      max_response_time: number;
      p50_response_time: number;
      p75_response_time: number;
      p90_response_time: number;
      p95_response_time: number;
      p99_response_time: number;
      uptime_percentage: number;
    }>(statsResult);
    const stats = statsData[0] || {
      total_checks: 0,
      successful_checks: 0,
      failed_checks: 0,
      timeout_checks: 0,
      avg_response_time: 0,
      min_response_time: 0,
      max_response_time: 0,
      p50_response_time: 0,
      p75_response_time: 0,
      p90_response_time: 0,
      p95_response_time: 0,
      p99_response_time: 0,
      uptime_percentage: 0,
    };

    // Determine time bucket based on time range and interval
    const hoursBack = hours || 24;
    const days = hoursBack / 24;

    let bucket = query.bucket || "hour"; // Default to hour if not specified
    if (!query.bucket) {
      // Auto-select bucket based on time range
      if (days <= 1) {
        bucket = "minute";
      } else if (days <= 3) {
        bucket = "five_minutes";
      } else if (days <= 7) {
        bucket = "ten_minutes";
      } else if (days <= 60) {
        bucket = "hour";
      } else {
        bucket = "day";
      }
    }

    // Validate bucket is in TimeBucketToFn
    const bucketFn = TimeBucketToFn[bucket as keyof typeof TimeBucketToFn] || TimeBucketToFn.hour;

    // Get response time distribution
    let distributionQuery = `
      SELECT 
        ${bucketFn}(timestamp) as time_bucket,
        avg(response_time_ms) as avg_response_time,
        avg(dns_time_ms) as avg_dns_time,
        avg(tcp_time_ms) as avg_tcp_time,
        avg(tls_time_ms) as avg_tls_time,
        avg(ttfb_ms) as avg_ttfb,
        avg(transfer_time_ms) as avg_transfer_time,
        count() as check_count,
        countIf(status = 'success') as success_count,
        countIf(status = 'failure') as failure_count,
        countIf(status = 'timeout') as timeout_count
      FROM monitor_events
      WHERE monitor_id = {monitorId: UInt32}
        AND timestamp >= now() - INTERVAL {hours: UInt32} HOUR
    `;

    if (region) {
      distributionQuery += ` AND region = {region: String}`;
    }

    distributionQuery += `
      GROUP BY time_bucket
      ORDER BY time_bucket ASC
    `;

    const distributionResult = await clickhouse.query({
      query: distributionQuery,
      query_params: queryParams,
      format: "JSONEachRow",
    });

    const distribution = await processResults(distributionResult);

    // Rename time_bucket back to hour for backward compatibility with frontend
    const formattedDistribution = distribution.map((item: any) => ({
      ...item,
      hour: item.time_bucket,
    }));

    return reply.status(200).send({
      hours: hours || 24, // Return the hours used
      region,
      stats: {
        totalChecks: Number(stats.total_checks),
        successfulChecks: Number(stats.successful_checks),
        failedChecks: Number(stats.failed_checks),
        timeoutChecks: Number(stats.timeout_checks),
        uptimePercentage: Number(stats.uptime_percentage),
        responseTime: {
          avg: Number(stats.avg_response_time),
          min: Number(stats.min_response_time),
          max: Number(stats.max_response_time),
          p50: Number(stats.p50_response_time),
          p75: Number(stats.p75_response_time),
          p90: Number(stats.p90_response_time),
          p95: Number(stats.p95_response_time),
          p99: Number(stats.p99_response_time),
        },
      },
      distribution: formattedDistribution,
      monitorType: monitor.monitorType,
      bucket,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as any;
      return reply.status(400).send({
        error: "Validation error",
        details: zodError.errors,
      });
    }
    console.error("Error retrieving monitor stats:", error);
    return reply.status(500).send({ error: "Internal server error" });
  }
}
