import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../../../db/postgres/postgres.js";
import { annotations } from "../../../db/postgres/schema.js";
import { getUserHasAdminAccessToSite } from "../../../lib/auth-utils.js";
import {
  annotationBelongsToSite,
  canManageAnnotation,
  getSiteOrganizationId,
  parseAnnotationId,
  parseSiteId,
} from "./annotationAccess.js";
import { updateAnnotationSchema } from "./annotationSchema.js";

export async function updateAnnotation(
  request: FastifyRequest<{
    Params: { siteId: string; annotationId: string };
    Body: unknown;
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
    const input = updateAnnotationSchema.parse(request.body);

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
      return reply.status(403).send({ error: "You can only edit annotations you created" });
    }

    // The merged row must still be a valid range.
    const nextDate = input.date ?? existing.date;
    const nextEndDate = input.endDate === undefined ? existing.endDate : input.endDate;
    if (nextEndDate && Date.parse(nextEndDate) <= Date.parse(nextDate)) {
      return reply.status(400).send({ error: "endDate must be after date" });
    }

    let nextSiteId: number | null | undefined;
    if (input.scope !== undefined) {
      const wantsOrgWide = input.scope === "organization";
      if (wantsOrgWide !== (existing.siteId === null)) {
        if (!(await getUserHasAdminAccessToSite(request, siteId))) {
          return reply.status(403).send({ error: "Only organization admins can change an annotation's scope" });
        }
        nextSiteId = wantsOrgWide ? null : siteId;
      }
    }

    const result = await db
      .update(annotations)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.date !== undefined ? { date: input.date } : {}),
        ...(input.endDate !== undefined ? { endDate: input.endDate } : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
        ...(input.icon !== undefined ? { icon: input.icon || null } : {}),
        ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
        ...(nextSiteId !== undefined ? { siteId: nextSiteId } : {}),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(annotations.annotationId, annotationId))
      .returning({ annotationId: annotations.annotationId });

    if (!result.length) {
      return reply.status(500).send({ error: "Failed to update annotation" });
    }

    return reply.send({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: "Validation error", details: error.errors });
    }
    request.log.error({ err: error }, "Error updating annotation");
    return reply.status(500).send({ error: "Failed to update annotation" });
  }
}
