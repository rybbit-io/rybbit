import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/postgres/postgres.js";
import { segments } from "../../../db/postgres/schema.js";
import {
  canEditSegment,
  canReadSegment,
  loadSegmentForSite,
  parsePositiveId,
  resolveSegmentActor,
} from "./segmentAccess.js";

export async function deleteSegment(
  request: FastifyRequest<{ Params: { siteId: string; segmentId: string } }>,
  reply: FastifyReply
) {
  const siteId = parsePositiveId(request.params.siteId);
  const segmentId = parsePositiveId(request.params.segmentId);
  if (!siteId) {
    return reply.status(400).send({ error: "Invalid site ID" });
  }
  if (!segmentId) {
    return reply.status(400).send({ error: "Invalid segment ID" });
  }

  try {
    const loaded = await loadSegmentForSite(siteId, segmentId);
    if (!loaded) {
      return reply.status(404).send({ error: "Segment not found" });
    }

    const actor = await resolveSegmentActor(request, siteId, loaded.organizationId);
    if (!canReadSegment(loaded.segment, actor)) {
      return reply.status(404).send({ error: "Segment not found" });
    }
    if (!canEditSegment(loaded.segment, actor)) {
      return reply.status(403).send({ error: "You can only delete segments you created" });
    }

    const result = await db
      .delete(segments)
      .where(eq(segments.segmentId, segmentId))
      .returning({ deleted: segments.segmentId });

    if (result.length === 0) {
      return reply.status(500).send({ error: "Failed to delete segment" });
    }

    return reply.send({ success: true });
  } catch (error) {
    request.log.error({ err: error }, "Error deleting segment");
    return reply.status(500).send({ error: "Failed to delete segment" });
  }
}
