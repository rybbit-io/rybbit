import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/postgres/postgres.js";
import { member, memberSiteAccess, team, teamMember, teamSiteAccess } from "../db/postgres/schema.js";

/**
 * Access — the one answer to "may this user touch this organization, or this
 * Site?".
 *
 * Two questions used to be answered in a dozen places each:
 *
 *  1. "Is this user in this organization, and as what?" — answered by three
 *     different query shapes across ~15 handlers. Now: {@link getOrgMembership}.
 *  2. "Which of an organization's sites may a member-role user see?" — the
 *     union of explicit grants, team sites and ungated sites, written out once
 *     here and consumed by both entry points (`getSitesUserHasAccessTo` in
 *     auth-utils, which spans organizations and credentials, and
 *     {@link filterSitesByMemberAccess}, which filters one already-loaded
 *     organization). Now: {@link resolveMemberSiteGrants} +
 *     {@link memberCanAccessSite}.
 *
 * Admin/owner members bypass the site rule entirely — callers handle that.
 */

export interface OrgMembership {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  hasRestrictedSiteAccess: boolean;
}

/**
 * The membership row for a user in an organization, or null. This is the only
 * place that asks the question — callers that want a boolean check for null,
 * and callers that want a role read `.role` (or use the predicates below).
 */
export async function getOrgMembership(
  userId: string | undefined | null,
  organizationId: string | undefined | null
): Promise<OrgMembership | null> {
  if (!userId || !organizationId) {
    return null;
  }

  const rows = await db
    .select({
      id: member.id,
      userId: member.userId,
      organizationId: member.organizationId,
      role: member.role,
      hasRestrictedSiteAccess: member.hasRestrictedSiteAccess,
    })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
    .limit(1);

  return rows[0] ?? null;
}

/** Admin or owner of the organization — the two roles that bypass site gating. */
export function isOrgAdmin(membership: OrgMembership | null | undefined): boolean {
  return membership?.role === "admin" || membership?.role === "owner";
}

/** Owner of the organization — the only role that may manage billing. */
export function isOrgOwner(membership: OrgMembership | null | undefined): boolean {
  return membership?.role === "owner";
}

/**
 * The grants that decide, together with the member's restriction flag, which
 * sites a member-role user may access. Resolved once per request and consulted
 * per site by {@link memberCanAccessSite}.
 */
export interface MemberSiteGrants {
  /** Explicit per-member grants (member_site_access). */
  explicitSiteIds: Set<number>;
  /** Sites gated behind any team in the scoped organizations. */
  teamGatedSiteIds: Set<number>;
  /** Sites reachable through the teams the user belongs to. */
  userTeamSiteIds: Set<number>;
}

const NO_GRANTS: MemberSiteGrants = {
  explicitSiteIds: new Set(),
  teamGatedSiteIds: new Set(),
  userTeamSiteIds: new Set(),
};

/**
 * Load the site grants for one user across the organizations where they hold a
 * member role.
 *
 * `grantedMemberIds` carries the member rows whose explicit grants apply.
 * Explicit grants are only recorded for members with restricted access, so
 * unrestricted members pass an empty list rather than paying for the query.
 */
export async function resolveMemberSiteGrants(options: {
  userId: string;
  organizationIds: string[];
  grantedMemberIds: string[];
}): Promise<MemberSiteGrants> {
  const { userId, organizationIds, grantedMemberIds } = options;

  if (organizationIds.length === 0 && grantedMemberIds.length === 0) {
    return NO_GRANTS;
  }

  const [explicitGrants, teamGated, userTeams] = await Promise.all([
    grantedMemberIds.length > 0
      ? db
          .select({ siteId: memberSiteAccess.siteId })
          .from(memberSiteAccess)
          .where(inArray(memberSiteAccess.memberId, grantedMemberIds))
      : Promise.resolve([]),
    organizationIds.length > 0
      ? db
          .select({ siteId: teamSiteAccess.siteId })
          .from(teamSiteAccess)
          .innerJoin(team, eq(teamSiteAccess.teamId, team.id))
          .where(inArray(team.organizationId, organizationIds))
      : Promise.resolve([]),
    organizationIds.length > 0
      ? db
          .select({ teamId: teamMember.teamId })
          .from(teamMember)
          .innerJoin(team, eq(teamMember.teamId, team.id))
          .where(and(eq(teamMember.userId, userId), inArray(team.organizationId, organizationIds)))
      : Promise.resolve([]),
  ]);

  const userTeamSiteIds = new Set<number>();
  if (userTeams.length > 0) {
    const userTeamSites = await db
      .select({ siteId: teamSiteAccess.siteId })
      .from(teamSiteAccess)
      .where(
        inArray(
          teamSiteAccess.teamId,
          userTeams.map(t => t.teamId)
        )
      );
    for (const s of userTeamSites) {
      userTeamSiteIds.add(s.siteId);
    }
  }

  return {
    explicitSiteIds: new Set(explicitGrants.map(g => g.siteId)),
    teamGatedSiteIds: new Set(teamGated.map(s => s.siteId)),
    userTeamSiteIds,
  };
}

/**
 * The site-access rule, in one place:
 *
 *  - explicit per-member grants always apply, even to sites gated by a team the
 *    member is not on
 *  - sites granted through the member's teams are always additive, regardless
 *    of whether the member has restricted site access
 *  - sites not gated by any team are visible only to unrestricted members
 */
export function memberCanAccessSite(
  grants: MemberSiteGrants,
  siteId: number,
  hasRestrictedSiteAccess: boolean
): boolean {
  if (grants.explicitSiteIds.has(siteId) || grants.userTeamSiteIds.has(siteId)) {
    return true;
  }
  if (hasRestrictedSiteAccess) {
    return false;
  }
  return !grants.teamGatedSiteIds.has(siteId);
}

/**
 * The closed set of sites a *restricted* member can reach — the narrowing
 * counterpart of {@link memberCanAccessSite}. Restricted access is entirely
 * grant-driven, so it can be enumerated instead of tested, which lets callers
 * load those sites by id rather than reading a whole organization and
 * discarding most of it.
 *
 * Keep this in step with the restricted branch of {@link memberCanAccessSite} —
 * the two are cross-checked in access.test.ts.
 */
export function restrictedMemberSiteIds(grants: MemberSiteGrants): number[] {
  return Array.from(new Set([...grants.explicitSiteIds, ...grants.userTeamSiteIds]));
}

/**
 * Filters one organization's sites down to what a member-role user can access.
 *
 * The adapter for callers that already hold an organization's sites and the
 * caller's member row (org site lists, weekly reports). Callers must handle
 * admin/owner roles themselves — they bypass filtering.
 */
export async function filterSitesByMemberAccess<T extends { siteId: number }>(
  orgSites: T[],
  organizationId: string,
  userId: string,
  memberId: string,
  hasRestrictedSiteAccess: boolean
): Promise<T[]> {
  const grants = await resolveMemberSiteGrants({
    userId,
    organizationIds: [organizationId],
    grantedMemberIds: hasRestrictedSiteAccess ? [memberId] : [],
  });

  return orgSites.filter(site => memberCanAccessSite(grants, site.siteId, hasRestrictedSiteAccess));
}
