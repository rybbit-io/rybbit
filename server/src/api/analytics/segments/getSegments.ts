import { asc } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/postgres/postgres.js";
import { segments } from "../../../db/postgres/schema.js";
import {
  canReadSegment,
  getSiteOrganizationId,
  parsePositiveId,
  resolveSegmentActor,
  segmentsForSiteCondition,
  serializeSegment,
} from "./segmentAccess.js";

export async function getSegments(
  request: FastifyRequest<{ Params: { siteId: string } }>,
  reply: FastifyReply
) {
  const siteId = parsePositiveId(request.params.siteId);
  if (!siteId) {
    return reply.status(400).send({ error: "Invalid site ID" });
  }

  try {
    const organizationId = await getSiteOrganizationId(siteId);
    if (!organizationId) {
      return reply.status(404).send({ error: "Site not found" });
    }

    const [actor, rows] = await Promise.all([
      resolveSegmentActor(request, siteId, organizationId),
      db.query.segments.findMany({
        where: segmentsForSiteCondition(siteId, organizationId),
        orderBy: [asc(segments.name)],
      }),
    ]);

    return reply.send(rows.filter(row => canReadSegment(row, actor)).map(row => serializeSegment(row, actor)));
  } catch (error) {
    request.log.error({ err: error }, "Error fetching segments");
    return reply.status(500).send({ error: "Failed to fetch segments" });
  }
}
