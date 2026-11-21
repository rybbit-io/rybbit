import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../../../db/postgres/postgres.js";
import { annotations } from "../../../db/postgres/schema.js";
import { getUserHasOrgPermission } from "../../../lib/auth-utils.js";
import { getSiteOrganizationId, parseSiteId } from "./annotationAccess.js";
import { createAnnotationSchema } from "./annotationSchema.js";

export async function createAnnotation(
  request: FastifyRequest<{
    Params: { siteId: string };
    Body: unknown;
  }>,
  reply: FastifyReply
) {
  const siteId = parseSiteId(request.params.siteId);
  if (!siteId) {
    return reply.status(400).send({ error: "Invalid site ID" });
  }

  try {
    const input = createAnnotationSchema.parse(request.body);

    const organizationId = await getSiteOrganizationId(siteId);
    if (!organizationId) {
      return reply.status(404).send({ error: "Site not found" });
    }

    // The route guard requires annotations:write on the site; an annotation on
    // every site of the organization needs annotations:manage in it.
    if (
      input.scope === "organization" &&
      !(await getUserHasOrgPermission(request, organizationId, "annotations:manage"))
    ) {
      return reply.status(403).send({ error: "Only organization admins can create organization-wide annotations" });
    }

    const result = await db
      .insert(annotations)
      .values({
        siteId: input.scope === "organization" ? null : siteId,
        organizationId,
        userId: request.user?.id ?? null,
        title: input.title,
        description: input.description ?? null,
        date: input.date,
        endDate: input.endDate ?? null,
        color: input.color ?? null,
        icon: input.icon || null,
        isPublic: input.isPublic,
      })
      .returning({ annotationId: annotations.annotationId });

    if (!result.length) {
      return reply.status(500).send({ error: "Failed to create annotation" });
    }

    return reply.status(201).send({ success: true, annotationId: result[0].annotationId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: "Validation error", details: error.errors });
    }
    request.log.error({ err: error }, "Error creating annotation");
    return reply.status(500).send({ error: "Failed to create annotation" });
  }
}
