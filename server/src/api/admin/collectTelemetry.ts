import { FastifyReply, FastifyRequest } from "fastify";
import { IS_CLOUD } from "../../lib/const.js";
import { db } from "../../db/postgres/postgres.js";
import { telemetry } from "../../db/postgres/schema.js";

export async function collectTelemetry(
  request: FastifyRequest<{
    Body: {
      instanceId: string;
      version: string;
      tableCounts: Record<string, number>;
      clickhouseSizeGb: number;
    };
  }>,
  reply: FastifyReply
) {
  // Only allow telemetry collection on cloud instances
  if (!IS_CLOUD) {
    return reply.status(403).send({ error: "Telemetry collection is only available on cloud instances" });
  }

  try {
    const { instanceId, version, tableCounts, clickhouseSizeGb } = request.body;

    // Validate required fields
    if (!instanceId || !version || !tableCounts || clickhouseSizeGb === undefined) {
      return reply.status(400).send({ error: "Missing required fields" });
    }

    // Insert telemetry data
    await db.insert(telemetry).values({
      instanceId,
      version,
      tableCounts,
      clickhouseSizeGb,
    });

    return reply.send({ success: true });
  } catch (error) {
    console.error("Error collecting telemetry:", error);
    return reply.status(500).send({ error: "Failed to collect telemetry" });
  }
}
