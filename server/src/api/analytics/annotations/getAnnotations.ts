import { and, asc, eq, gte, lt, sql } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { DateTime } from "luxon";
import { z } from "zod";
import { db } from "../../../db/postgres/postgres.js";
import { annotations, user } from "../../../db/postgres/schema.js";
import { getUserHasAccessToSite } from "../../../lib/auth-utils.js";
import { isValidTimeZone } from "../utils/timeWindow.js";
import { annotationsForSite, getSiteOrganizationId, parseSiteId } from "./annotationAccess.js";
import { listAnnotationsQuerySchema } from "./annotationSchema.js";

export async function getAnnotations(
  request: FastifyRequest<{
    Params: { siteId: string };
    Querystring: { start_date?: string; end_date?: string; time_zone?: string };
  }>,
  reply: FastifyReply
) {
  const siteId = parseSiteId(request.params.siteId);
  if (!siteId) {
    return reply.status(400).send({ error: "Invalid site ID" });
  }

  try {
    // This route deliberately skips the shared time validator, which requires
    // both bounds together; here either bound may stand alone.
    const query = listAnnotationsQuerySchema.parse(request.query ?? {});
    const timeZone = query.time_zone ?? "UTC";
    if (!isValidTimeZone(timeZone)) {
      return reply.status(400).send({ error: "Invalid time_zone" });
    }

    const organizationId = await getSiteOrganizationId(siteId);
    if (!organizationId) {
      return reply.status(404).send({ error: "Site not found" });
    }

    // The route is public-guarded: anonymous viewers of a public site or a
    // private link only see annotations marked public.
    const fullAccess = await getUserHasAccessToSite(request, siteId);

    const conditions = [annotationsForSite(siteId, organizationId)];
    if (!fullAccess) conditions.push(eq(annotations.isPublic, true));

    // Day bounds are resolved in the caller's timezone (the dashboard sends
    // its own), as a half-open interval [start of start_date, start of the
    // day after end_date). A range annotation overlaps if it ends after the
    // window starts and starts before the window ends.
    if (query.start_date) {
      const start = DateTime.fromISO(query.start_date, { zone: timeZone }).startOf("day").toUTC().toISO()!;
      conditions.push(gte(sql`coalesce(${annotations.endDate}, ${annotations.date})`, start));
    }
    if (query.end_date) {
      const endExclusive = DateTime.fromISO(query.end_date, { zone: timeZone })
        .plus({ days: 1 })
        .startOf("day")
        .toUTC()
        .toISO()!;
      conditions.push(lt(annotations.date, endExclusive));
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
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: "Validation error", details: error.errors });
    }
    request.log.error({ err: error }, "Error fetching annotations");
    return reply.status(500).send({ error: "Failed to fetch annotations" });
  }
}
