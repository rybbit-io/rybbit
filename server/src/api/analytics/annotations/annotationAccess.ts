import { and, eq, isNull, or, SQL } from "drizzle-orm";
import { FastifyRequest } from "fastify";
import { db } from "../../../db/postgres/postgres.js";
import { annotations, sites } from "../../../db/postgres/schema.js";
import { getUserHasAdminAccessToSite } from "../../../lib/auth-utils.js";

export type AnnotationRow = typeof annotations.$inferSelect;

export function parseSiteId(raw: string): number | null {
  const siteId = parseInt(raw, 10);
  return isNaN(siteId) || siteId <= 0 ? null : siteId;
}

export function parseAnnotationId(raw: string): number | null {
  const id = parseInt(raw, 10);
  return isNaN(id) || id <= 0 ? null : id;
}

export async function getSiteOrganizationId(siteId: number): Promise<string | null> {
  const site = await db.query.sites.findFirst({
    where: eq(sites.siteId, siteId),
    columns: { organizationId: true },
  });
  return site?.organizationId ?? null;
}

/** Annotations that apply to a site: its own plus its organization's site-less ones. */
export function annotationsForSite(siteId: number, organizationId: string): SQL {
  return or(
    eq(annotations.siteId, siteId),
    and(isNull(annotations.siteId), eq(annotations.organizationId, organizationId))
  )!;
}

export function annotationBelongsToSite(row: AnnotationRow, siteId: number, organizationId: string): boolean {
  return row.siteId === siteId || (row.siteId === null && row.organizationId === organizationId);
}

/**
 * Admins and owners manage every annotation on their sites. Members may only
 * change what they created, and never organization-wide annotations.
 */
export async function canManageAnnotation(
  request: FastifyRequest,
  siteId: number,
  row: AnnotationRow
): Promise<boolean> {
  if (await getUserHasAdminAccessToSite(request, siteId)) return true;
  if (row.siteId === null) return false;
  const userId = request.user?.id;
  return Boolean(userId) && row.userId === userId;
}
