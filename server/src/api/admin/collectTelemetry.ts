import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { IS_CLOUD } from "../../lib/const.js";
import { db } from "../../db/postgres/postgres.js";
import { telemetry } from "../../db/postgres/schema.js";

// The endpoint is public, so bound what an anonymous caller can store.
const telemetryBodySchema = z.object({
  instanceId: z.string().min(1).max(128),
  version: z.string().min(1).max(64),
  tableCounts: z
    .record(z.string().max(128), z.number().nonnegative())
    .refine(counts => Object.keys(counts).length <= 50, { message: "Too many tables" }),
  clickhouseSizeGb: z.number().nonnegative(),
});

export async function collectTelemetry(request: FastifyRequest, reply: FastifyReply) {
  // Only allow telemetry collection on cloud instances
  if (!IS_CLOUD) {
    return reply.status(403).send({ error: "Telemetry collection is only available on cloud instances" });
  }

  const parsed = telemetryBodySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Invalid telemetry payload" });
  }

  try {
    const { instanceId, version, tableCounts, clickhouseSizeGb } = parsed.data;

    // Insert telemetry data
    await db.insert(telemetry).values({
      instanceId,
      version,
      tableCounts,
      clickhouseSizeGb,
    });

    return reply.send({ success: true });
  } catch (error) {
    request.log.error({ err: error }, "Error collecting telemetry");
    return reply.status(500).send({ error: "Failed to collect telemetry" });
  }
}
