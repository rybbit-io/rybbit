import { FastifyReply, FastifyRequest } from "fastify";
import { canReadSegment, loadSegmentForSite, parsePositiveId, resolveSegmentActor, serializeSegment } from "./segmentAccess.js";

export async function getSegment(
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
    // A private segment is indistinguishable from a missing one to a viewer
    // without site access, so its existence is never confirmed.
    if (!canReadSegment(loaded.segment, actor)) {
      return reply.status(404).send({ error: "Segment not found" });
    }

    return reply.send(serializeSegment(loaded.segment, actor));
  } catch (error) {
    request.log.error({ err: error }, "Error fetching segment");
    return reply.status(500).send({ error: "Failed to fetch segment" });
  }
}
