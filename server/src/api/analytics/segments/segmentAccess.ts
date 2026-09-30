import { roleHasPermission, type Segment } from "@rybbit/shared";
import { and, eq, isNull, or } from "drizzle-orm";
import { FastifyRequest } from "fastify";
import { db } from "../../../db/postgres/postgres.js";
import { segments, sites } from "../../../db/postgres/schema.js";
import { getUserOrgRole, getUserSiteRole } from "../../../lib/auth-utils.js";

export type SegmentRow = typeof segments.$inferSelect;

/**
 * Who is asking, reduced to the three facts the segment rules depend on.
 * Public-dashboard and private-link viewers have neither site access nor a
 * user id; they only ever see public segments.
 */
export interface SegmentActor {
  userId: string | null;
  /** Session member of the site's org, a user API key with site access, or the org's own key. */
  hasSiteAccess: boolean;
  /** Holds segments:manage in the organization: edits org-wide segments and creates them. */
  canManage: boolean;
  /** Holds segments:manage on this site: edits anyone's segments for it. */
  canManageSite: boolean;
}

export const NO_ACCESS_ACTOR: SegmentActor = {
  userId: null,
  hasSiteAccess: false,
  canManage: false,
  canManageSite: false,
};

export async function getSiteOrganizationId(siteId: number): Promise<string | null> {
  const site = await db.query.sites.findFirst({
    where: eq(sites.siteId, siteId),
    columns: { organizationId: true },
  });
  return site?.organizationId ?? null;
}

export async function resolveSegmentActor(
  request: FastifyRequest,
  siteId: number,
  organizationId: string,
  // Writes decide on the role as it stands now, not this worker's cached copy.
  { forWrite = false }: { forWrite?: boolean } = {}
): Promise<SegmentActor> {
  // Organization-owned API keys carry org-admin authority over their own
  // organization's sites and nothing else (see getSitesUserHasAccessTo).
  if (!request.user?.id && request.apiKeyOrganizationId) {
    const ownsSite = request.apiKeyOrganizationId === organizationId;
    return { userId: null, hasSiteAccess: ownsSite, canManage: ownsSite, canManageSite: ownsSite };
  }

  const userId: string | null = request.user?.id ?? null;
  if (!userId) {
    return NO_ACCESS_ACTOR;
  }

  const [siteRole, orgRole] = await Promise.all([
    getUserSiteRole(request, siteId, { fresh: forWrite }),
    getUserOrgRole(request, organizationId),
  ]);

  return {
    userId,
    hasSiteAccess: siteRole !== null,
    canManage: roleHasPermission(orgRole, "segments:manage"),
    canManageSite: roleHasPermission(siteRole, "segments:manage"),
  };
}

/** Anyone with site access reads every segment; everyone else reads public ones. */
export function canReadSegment(segment: Pick<SegmentRow, "isPublic">, actor: SegmentActor): boolean {
  return actor.hasSiteAccess || segment.isPublic;
}

/**
 * segments:manage in the organization edits org-wide segments; on the site, it
 * edits anyone's segments for that site. Otherwise people edit the site
 * segments they created.
 */
export function canEditSegment(segment: Pick<SegmentRow, "userId" | "siteId">, actor: SegmentActor): boolean {
  if (segment.siteId === null) {
    return actor.canManage;
  }
  if (actor.canManageSite) {
    return true;
  }
  return actor.hasSiteAccess && actor.userId !== null && segment.userId === actor.userId;
}

/** A segment applies to a site when it is that site's own or org-wide within the site's org. */
export function segmentBelongsToSite(
  segment: Pick<SegmentRow, "siteId" | "organizationId">,
  siteId: number,
  organizationId: string
): boolean {
  return segment.organizationId === organizationId && (segment.siteId === null || segment.siteId === siteId);
}

export const segmentsForSiteCondition = (siteId: number, organizationId: string) =>
  and(eq(segments.organizationId, organizationId), or(isNull(segments.siteId), eq(segments.siteId, siteId)));

export async function loadSegmentForSite(
  siteId: number,
  segmentId: number
): Promise<{ segment: SegmentRow; organizationId: string } | null> {
  const organizationId = await getSiteOrganizationId(siteId);
  if (!organizationId) {
    return null;
  }

  const segment = await db.query.segments.findFirst({ where: eq(segments.segmentId, segmentId) });
  if (!segment || !segmentBelongsToSite(segment, siteId, organizationId)) {
    return null;
  }

  return { segment, organizationId };
}

export function serializeSegment(row: SegmentRow, actor: SegmentActor): Segment {
  return {
    segmentId: row.segmentId,
    siteId: row.siteId,
    organizationId: row.organizationId,
    // The creator's account id is only meaningful to members of the site.
    userId: actor.hasSiteAccess ? row.userId : null,
    name: row.name,
    description: row.description,
    filters: row.filters,
    isPublic: row.isPublic,
    type: row.type,
    createdAt: row.createdAt ?? "",
    updatedAt: row.updatedAt ?? "",
    canEdit: canEditSegment(row, actor),
  };
}

export function parsePositiveId(raw: string): number | null {
  const id = parseInt(raw, 10);
  return Number.isNaN(id) || id <= 0 ? null : id;
}
