import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/postgres/postgres.js";
import { annotations, user } from "../../../db/postgres/schema.js";
import { getUserHasAccessToSite } from "../../../lib/auth-utils.js";
import { annotationsForSite, getSiteOrganizationId, parseSiteId } from "./annotationAccess.js";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export async function getAnnotations(
  request: FastifyRequest<{
    Params: { siteId: string };
    Querystring: { start_date?: string; end_date?: string };
  }>,
  reply: FastifyReply
) {
  const siteId = parseSiteId(request.params.siteId);
  if (!siteId) {
    return reply.status(400).send({ error: "Invalid site ID" });
  }

  try {
    const organizationId = await getSiteOrganizationId(siteId);
    if (!organizationId) {
      return reply.status(404).send({ error: "Site not found" });
    }

    // The route is public-guarded: anonymous viewers of a public site or a
    // private link only see annotations marked public.
    const fullAccess = await getUserHasAccessToSite(request, siteId);

    const conditions = [annotationsForSite(siteId, organizationId)];
    if (!fullAccess) conditions.push(eq(annotations.isPublic, true));

    const { start_date: startDate, end_date: endDate } = request.query;
    if (startDate && DATE_ONLY.test(startDate)) {
      // A range annotation overlaps the window if it ends on or after the start.
      conditions.push(gte(sql`coalesce(${annotations.endDate}, ${annotations.date})`, `${startDate}T00:00:00.000Z`));
    }
    if (endDate && DATE_ONLY.test(endDate)) {
      conditions.push(lte(annotations.date, `${endDate}T23:59:59.999Z`));
    }

    const rows = await db
      .select({
        annotationId: annotations.annotationId,
        siteId: annotations.siteId,
        organizationId: annotations.organizationId,
        userId: annotations.userId,
        userName: user.name,
        title: annotations.title,
        description: annotations.description,
        date: annotations.date,
        endDate: annotations.endDate,
        color: annotations.color,
        icon: annotations.icon,
        isPublic: annotations.isPublic,
        createdAt: annotations.createdAt,
        updatedAt: annotations.updatedAt,
      })
      .from(annotations)
      .leftJoin(user, eq(user.id, annotations.userId))
      .where(and(...conditions))
      .orderBy(asc(annotations.date), asc(annotations.annotationId));

    return reply.send(rows);
  } catch (error) {
    request.log.error({ err: error }, "Error fetching annotations");
    return reply.status(500).send({ error: "Failed to fetch annotations" });
  }
}
