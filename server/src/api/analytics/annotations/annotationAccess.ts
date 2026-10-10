import { and, eq, isNull, or, SQL } from "drizzle-orm";
import { FastifyRequest } from "fastify";
import { db } from "../../../db/postgres/postgres.js";
import { annotations, sites } from "../../../db/postgres/schema.js";
import { getUserHasOrgPermission, getUserHasSitePermission } from "../../../lib/auth-utils.js";

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
 * annotations:manage lets its holder change any annotation it covers: on the
 * site for a site's annotations (so a per-site editor manages that site's),
 * in the organization for organization-wide ones. Others may only change what
 * they created, and never organization-wide annotations.
 */
export async function canManageAnnotation(request: FastifyRequest, row: AnnotationRow): Promise<boolean> {
  if (row.siteId === null) {
    return getUserHasOrgPermission(request, row.organizationId, "annotations:manage");
  }
  if (await getUserHasSitePermission(request, row.siteId, "annotations:manage")) return true;
  const userId = request.user?.id;
  return Boolean(userId) && row.userId === userId;
}
