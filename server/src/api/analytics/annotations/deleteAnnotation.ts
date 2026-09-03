import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/postgres/postgres.js";
import { annotations } from "../../../db/postgres/schema.js";
import {
  annotationBelongsToSite,
  canManageAnnotation,
  getSiteOrganizationId,
  parseAnnotationId,
  parseSiteId,
} from "./annotationAccess.js";

export async function deleteAnnotation(
  request: FastifyRequest<{
    Params: { siteId: string; annotationId: string };
  }>,
  reply: FastifyReply
) {
  const siteId = parseSiteId(request.params.siteId);
  const annotationId = parseAnnotationId(request.params.annotationId);
  if (!siteId) {
    return reply.status(400).send({ error: "Invalid site ID" });
  }
  if (!annotationId) {
    return reply.status(400).send({ error: "Invalid annotation ID" });
  }

  try {
    const organizationId = await getSiteOrganizationId(siteId);
    if (!organizationId) {
      return reply.status(404).send({ error: "Site not found" });
    }

    const existing = await db.query.annotations.findFirst({
      where: eq(annotations.annotationId, annotationId),
    });
    if (!existing || !annotationBelongsToSite(existing, siteId, organizationId)) {
      return reply.status(404).send({ error: "Annotation not found" });
    }

    if (!(await canManageAnnotation(request, siteId, existing))) {
      return reply.status(403).send({ error: "You can only delete annotations you created" });
    }

    const result = await db
      .delete(annotations)
      .where(eq(annotations.annotationId, annotationId))
      .returning({ deleted: annotations.annotationId });

    if (!result.length) {
      return reply.status(500).send({ error: "Failed to delete annotation" });
    }

    return reply.send({ success: true });
  } catch (error) {
    request.log.error({ err: error }, "Error deleting annotation");
    return reply.status(500).send({ error: "Failed to delete annotation" });
  }
}
