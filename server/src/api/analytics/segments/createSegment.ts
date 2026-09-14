import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../../../db/postgres/postgres.js";
import { segments } from "../../../db/postgres/schema.js";
import { getSiteOrganizationId, parsePositiveId, resolveSegmentActor, serializeSegment } from "./segmentAccess.js";
import { createSegmentSchema } from "./segmentSchema.js";

export async function createSegment(
  request: FastifyRequest<{ Params: { siteId: string }; Body: unknown }>,
  reply: FastifyReply
) {
  const siteId = parsePositiveId(request.params.siteId);
  if (!siteId) {
    return reply.status(400).send({ error: "Invalid site ID" });
  }

  try {
    const body = createSegmentSchema.parse(request.body);

    const organizationId = await getSiteOrganizationId(siteId);
    if (!organizationId) {
      return reply.status(404).send({ error: "Site not found" });
    }

    // Site access is enforced by the requireSiteAccess preHandler; the actor
    // is still resolved because org-wide scope is an admin decision.
    const actor = await resolveSegmentActor(request, siteId, organizationId);
    if (!actor.hasSiteAccess) {
      return reply.status(403).send({ error: "Forbidden" });
    }

    const orgWide = body.scope === "organization";
    if (orgWide && !actor.isAdmin) {
      return reply.status(403).send({ error: "Only organization admins can create organization-wide segments" });
    }

    const [row] = await db
      .insert(segments)
      .values({
        organizationId,
        siteId: orgWide ? null : siteId,
        userId: actor.userId,
        name: body.name,
        description: body.description ?? null,
        filters: body.filters,
        isPublic: body.isPublic ?? false,
      })
      .returning();

    if (!row) {
      return reply.status(500).send({ error: "Failed to create segment" });
    }

    return reply.status(201).send(serializeSegment(row, actor));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: "Validation error", details: error.errors });
    }
    request.log.error({ err: error }, "Error creating segment");
    return reply.status(500).send({ error: "Failed to create segment" });
  }
}
