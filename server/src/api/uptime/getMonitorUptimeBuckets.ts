import { and, eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { db } from "../../db/postgres/postgres.js";
import { member, uptimeMonitors } from "../../db/postgres/schema.js";
import { getSessionFromReq } from "../../lib/auth-utils.js";
import { processResults } from "../analytics/utils/utils.js";

// Query params schema
const getMonitorUptimeBucketsQuerySchema = z.object({
  bucket: z.enum(["hour", "day", "week"]).default("day"),
  days: z.string().transform(Number).pipe(z.number().int().positive().max(90)).default("7"),
  timeZone: z.string().optional(),
});

interface GetMonitorUptimeBucketsRequest {
  Params: {
    monitorId: string;
  };
  Querystring: z.infer<typeof getMonitorUptimeBucketsQuerySchema>;
}

export async function getMonitorUptimeBuckets(
  request: FastifyRequest<GetMonitorUptimeBucketsRequest>,
  reply: FastifyReply
) {
  const session = await getSessionFromReq(request);
  const userId = session?.user?.id;
  const { monitorId } = request.params;

  if (!userId) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  try {
    // Validate query parameters
    const query = getMonitorUptimeBucketsQuerySchema.parse(request.query);
    const { bucket, days, timeZone = "UTC" } = query;

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

    // Determine the time bucket function based on the bucket parameter
    let timeBucketFn: string;
    let dateFormat: string;
    switch (bucket) {
      case "hour":
        timeBucketFn = `toStartOfHour(toTimeZone(timestamp, '${timeZone}'))`;
        dateFormat = "%Y-%m-%d %H:00:00";
        break;
      case "week":
        timeBucketFn = `toStartOfWeek(toTimeZone(timestamp, '${timeZone}'))`;
        dateFormat = "%Y-%m-%d";
        break;
      case "day":
      default:
        timeBucketFn = `toStartOfDay(toTimeZone(timestamp, '${timeZone}'))`;
        dateFormat = "%Y-%m-%d";
        break;
    }

    // Query to get bucketed uptime data
    const query_str = `
      SELECT 
        toTimeZone(bucket_time_tz, 'UTC') as bucket_time,
        formatDateTime(bucket_time_tz, '${dateFormat}', '${timeZone}') as bucket_formatted,
        count() as total_checks,
        countIf(status = 'success') as successful_checks,
        countIf(status = 'failure') as failed_checks,
        countIf(status = 'timeout') as timeout_checks,
        if(count() > 0, 
           round(100.0 * countIf(status = 'success') / count(), 2), 
           100.0) as uptime_percentage
      FROM (
        SELECT 
          *,
          ${timeBucketFn} as bucket_time_tz
        FROM monitor_events
        WHERE monitor_id = {monitorId: UInt32}
          AND timestamp >= now() - INTERVAL {days: UInt32} DAY
      )
      GROUP BY bucket_time_tz
      ORDER BY bucket_time_tz DESC
    `;

    const result = await clickhouse.query({
      query: query_str,
      query_params: {
        monitorId: Number(monitorId),
        days: days,
      },
      format: "JSONEachRow",
    });

    const buckets = await processResults(result);

    // Generate all expected buckets for the time range
    // Use timezone-aware date generation
    const nowInTz = new Date(new Date().toLocaleString("en-US", { timeZone }));
    const allBuckets: Array<{
      bucket_time: string;
      bucket_formatted: string;
      total_checks: number;
      successful_checks: number;
      failed_checks: number;
      timeout_checks: number;
      uptime_percentage: number;
    }> = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(nowInTz);

      if (bucket === "hour") {
        // For hourly buckets, generate 24 buckets per day
        for (let h = 0; h < 24; h++) {
          date.setDate(date.getDate() - i);
          date.setHours(23 - h, 0, 0, 0);
          if (date <= nowInTz) {
            allBuckets.push({
              bucket_time: date.toISOString(),
              bucket_formatted: date.toISOString().slice(0, 13) + ":00:00",
              total_checks: 0,
              successful_checks: 0,
              failed_checks: 0,
              timeout_checks: 0,
              uptime_percentage: 100.0,
            });
          }
        }
      } else if (bucket === "week") {
        // For weekly buckets, calculate start of week
        date.setDate(date.getDate() - i * 7);
        const dayOfWeek = date.getDay();
        const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday as start
        date.setDate(diff);
        date.setHours(0, 0, 0, 0);

        if (allBuckets.length === 0 || !allBuckets.some(b => b.bucket_formatted === date.toISOString().slice(0, 10))) {
          allBuckets.push({
            bucket_time: date.toISOString(),
            bucket_formatted: date.toISOString().slice(0, 10),
            total_checks: 0,
            successful_checks: 0,
            failed_checks: 0,
            timeout_checks: 0,
            uptime_percentage: 100.0,
          });
        }
      } else {
        // Daily buckets
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        allBuckets.push({
          bucket_time: date.toISOString(),
          bucket_formatted: date.toISOString().slice(0, 10),
          total_checks: 0,
          successful_checks: 0,
          failed_checks: 0,
          timeout_checks: 0,
          uptime_percentage: 100.0,
        });
      }
    }

    // Merge actual data with empty buckets
    const bucketsMap = new Map(buckets.map((b: any) => [b.bucket_formatted, b]));

    const mergedBuckets = allBuckets.map(emptyBucket => {
      const actualData = bucketsMap.get(emptyBucket.bucket_formatted);
      return actualData || emptyBucket;
    });

    // Sort by bucket_time ascending (oldest first) for frontend display
    mergedBuckets.sort((a, b) => new Date(a.bucket_time).getTime() - new Date(b.bucket_time).getTime());

    return reply.status(200).send({
      buckets: mergedBuckets,
      bucket,
      days,
      monitorId: Number(monitorId),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as any;
      return reply.status(400).send({
        error: "Validation error",
        details: zodError.errors,
      });
    }
    console.error("Error retrieving monitor uptime buckets:", error);
    return reply.status(500).send({ error: "Internal server error" });
  }
}
