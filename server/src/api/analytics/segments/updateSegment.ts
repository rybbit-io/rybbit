import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../../../db/postgres/postgres.js";
import { segments } from "../../../db/postgres/schema.js";
import {
  canEditSegment,
  canReadSegment,
  loadSegmentForSite,
  parsePositiveId,
  resolveSegmentActor,
  serializeSegment,
} from "./segmentAccess.js";
import { updateSegmentSchema } from "./segmentSchema.js";

export async function updateSegment(
  request: FastifyRequest<{ Params: { siteId: string; segmentId: string }; Body: unknown }>,
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
    const body = updateSegmentSchema.parse(request.body);

    const loaded = await loadSegmentForSite(siteId, segmentId);
    if (!loaded) {
      return reply.status(404).send({ error: "Segment not found" });
    }

    const actor = await resolveSegmentActor(request, siteId, loaded.organizationId);
    if (!canReadSegment(loaded.segment, actor)) {
      return reply.status(404).send({ error: "Segment not found" });
    }
    if (!canEditSegment(loaded.segment, actor)) {
      return reply.status(403).send({ error: "You can only edit segments you created" });
    }

    const becomesOrgWide = body.scope === "organization" && loaded.segment.siteId !== null;
    if (becomesOrgWide && !actor.isAdmin) {
      return reply.status(403).send({ error: "Only organization admins can share a segment with every site" });
    }

    const [row] = await db
      .update(segments)
      .set({
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.filters !== undefined ? { filters: body.filters } : {}),
        ...(body.isPublic !== undefined ? { isPublic: body.isPublic } : {}),
        ...(body.scope !== undefined ? { siteId: body.scope === "organization" ? null : siteId } : {}),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(segments.segmentId, segmentId))
      .returning();

    if (!row) {
      return reply.status(500).send({ error: "Failed to update segment" });
    }

    return reply.send(serializeSegment(row, actor));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: "Validation error", details: error.errors });
    }
    request.log.error({ err: error }, "Error updating segment");
    return reply.status(500).send({ error: "Failed to update segment" });
  }
}
