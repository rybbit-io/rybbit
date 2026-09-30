import { higherRole, isAdminRole, isOrgRole, isSiteGrantRole, type OrgRole } from "@rybbit/shared";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/postgres/postgres.js";
import { member, memberSiteAccess, sites, team, teamMember, teamSiteAccess } from "../db/postgres/schema.js";

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

/**
 * The role a membership holds across the organization as a whole — what the
 * organization-level permissions (org routes, org-wide segments and
 * annotations) are checked against. A member restricted to specific sites is a
 * viewer at that level: their role applies on the sites they were granted, not
 * to things that span sites they cannot see.
 */
export function effectiveOrgRole(
  membership: Pick<OrgMembership, "role" | "hasRestrictedSiteAccess"> | null | undefined
): OrgRole | null {
  if (!membership || !isOrgRole(membership.role)) {
    return null;
  }
  if (membership.hasRestrictedSiteAccess && !isAdminRole(membership.role)) {
    return "viewer";
  }
  return membership.role;
}

/** Admin or owner of the organization — the two roles that bypass site gating. */
export function isOrgAdmin(membership: OrgMembership | null | undefined): boolean {
  return isAdminRole(membership?.role);
}

/** Owner of the organization — the only role that may manage billing. */
export function isOrgOwner(membership: OrgMembership | null | undefined): boolean {
  return membership?.role === "owner";
}

/**
 * Which of these site ids currently belong to the organization.
 *
 * Every write into memberSiteAccess must pass its ids through here: a site can
 * move organizations (applySiteMove) or be deleted between the moment a grant
 * is authored and the moment it is stored, and a grant naming a site the
 * organization no longer owns is not a grant anybody authorized. Callers that
 * report the rejects derive them from the complement.
 */
export async function siteIdsInOrganization(siteIds: number[], organizationId: string): Promise<number[]> {
  if (siteIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({ siteId: sites.siteId })
    .from(sites)
    .where(and(eq(sites.organizationId, organizationId), inArray(sites.siteId, siteIds)));

  return rows.map(row => row.siteId);
}

/**
 * A grant's role; null means "the member's organization role". A site reached
 * through several grants lists each one's role.
 */
type GrantRoles = (string | null)[];

/**
 * The grants that decide, together with the member's restriction flag, which
 * sites a non-admin member may access and with what role. Resolved once per
 * request and consulted per site by {@link memberSiteRole}.
 */
export interface MemberSiteGrants {
  /** Explicit per-member grants (member_site_access), with each grant's role. */
  explicitSiteIds: Map<number, GrantRoles>;
  /** Sites gated behind any team in the scoped organizations. */
  teamGatedSiteIds: Set<number>;
  /** Sites reachable through the teams the user belongs to, with each team grant's role. */
  userTeamSiteIds: Map<number, GrantRoles>;
}

const NO_GRANTS: MemberSiteGrants = {
  explicitSiteIds: new Map(),
  teamGatedSiteIds: new Set(),
  userTeamSiteIds: new Map(),
};

// A grant row naming a role no grant can carry (unknown, or admin/owner) is
// ignored outright, so reachability and role never disagree about it.
function addGrant(grants: Map<number, GrantRoles>, siteId: number, role: string | null | undefined) {
  if (role != null && !isSiteGrantRole(role)) return;
  const roles = grants.get(siteId);
  if (roles) roles.push(role ?? null);
  else grants.set(siteId, [role ?? null]);
}

/**
 * Load the site grants for one user across the organizations where they hold a
 * non-admin role.
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
          .select({ siteId: memberSiteAccess.siteId, role: memberSiteAccess.role })
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

  const userTeamSiteIds = new Map<number, GrantRoles>();
  if (userTeams.length > 0) {
    const userTeamSites = await db
      .select({ siteId: teamSiteAccess.siteId, role: teamSiteAccess.role })
      .from(teamSiteAccess)
      .where(
        inArray(
          teamSiteAccess.teamId,
          userTeams.map(t => t.teamId)
        )
      );
    for (const s of userTeamSites) {
      addGrant(userTeamSiteIds, s.siteId, s.role);
    }
  }

  const explicitSiteIds = new Map<number, GrantRoles>();
  for (const grant of explicitGrants) {
    addGrant(explicitSiteIds, grant.siteId, grant.role);
  }

  return {
    explicitSiteIds,
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
 * The role a non-admin member holds on a site, or null when they cannot reach
 * it. The member's organization role applies on every site they reach; an
 * explicit or team grant naming a higher role raises it on that site, and never
 * lowers it. (Grants stop at editor, and rows naming anything else are dropped
 * when loaded.)
 *
 * Reachability is exactly {@link memberCanAccessSite}; this adds the role.
 */
export function memberSiteRole(
  grants: MemberSiteGrants,
  siteId: number,
  membership: { role: OrgRole; hasRestrictedSiteAccess: boolean }
): OrgRole | null {
  const grantRoles = [...(grants.explicitSiteIds.get(siteId) ?? []), ...(grants.userTeamSiteIds.get(siteId) ?? [])];
  const reachable =
    grantRoles.length > 0 || (!membership.hasRestrictedSiteAccess && !grants.teamGatedSiteIds.has(siteId));
  if (!reachable) {
    return null;
  }

  let role: OrgRole | null = membership.role;
  for (const granted of grantRoles) {
    role = higherRole(role, granted);
  }
  return role;
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
  return Array.from(new Set([...grants.explicitSiteIds.keys(), ...grants.userTeamSiteIds.keys()]));
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

export type SiteRow = typeof sites.$inferSelect;

/** A site the caller can reach, with the role they hold on it. */
export type AccessibleSite = SiteRow & { accessRole: OrgRole };

/**
 * Every site a user reaches through their organization memberships, each with
 * the role they hold on it — the single computation behind both the session
 * and the bearer-credential paths, so a personal API key reaches exactly what
 * its user's browser session reaches.
 *
 * Admin/owner memberships reach every site of the organization. Any other
 * role reaches the sites the Site Access rule ({@link memberCanAccessSite})
 * admits. A membership whose role is not a known role reaches nothing.
 *
 * System-admin authority is not a membership and is not applied here; the
 * session layer adds it.
 */
export async function resolveUserSites(userId: string): Promise<AccessibleSite[]> {
  const memberRecords = await db
    .select({
      id: member.id,
      organizationId: member.organizationId,
      role: member.role,
      hasRestrictedSiteAccess: member.hasRestrictedSiteAccess,
    })
    .from(member)
    .where(eq(member.userId, userId));

  const roleByOrgId = new Map<string, OrgRole>();
  const fullAccessOrgIds: string[] = [];
  const gatedMembers: typeof memberRecords = [];

  for (const record of memberRecords) {
    if (!isOrgRole(record.role)) {
      continue;
    }
    roleByOrgId.set(record.organizationId, record.role);
    if (isAdminRole(record.role)) {
      fullAccessOrgIds.push(record.organizationId);
    } else {
      gatedMembers.push(record);
    }
  }

  const gatedRowByOrgId = new Map(gatedMembers.map(record => [record.organizationId, record]));
  const gatedOrgIds = Array.from(gatedRowByOrgId.keys());
  const restrictedMembers = gatedMembers.filter(record => record.hasRestrictedSiteAccess);
  const restrictedOrgIds = restrictedMembers.map(record => record.organizationId);

  // A restricted membership reaches a closed set of sites, so its
  // organization is loaded by id below rather than read in full and
  // discarded — an org can hold far more sites than one member is granted.
  const restrictedOrgIdSet = new Set(restrictedOrgIds);
  const eagerOrgIds = Array.from(
    new Set([...fullAccessOrgIds, ...gatedOrgIds.filter(id => !restrictedOrgIdSet.has(id))])
  );

  if (eagerOrgIds.length === 0 && restrictedOrgIds.length === 0) {
    return [];
  }

  const [eagerSites, grants] = await Promise.all([
    eagerOrgIds.length > 0
      ? db.select().from(sites).where(inArray(sites.organizationId, eagerOrgIds))
      : Promise.resolve([]),
    gatedOrgIds.length > 0
      ? resolveMemberSiteGrants({
          userId,
          organizationIds: gatedOrgIds,
          grantedMemberIds: restrictedMembers.map(record => record.id),
        })
      : null,
  ]);

  // Admin/owner memberships hold their role on every site of the
  // organization; other roles hold whatever their grants give them per site.
  const withRole = (site: SiteRow): AccessibleSite | null => {
    const orgRole = site.organizationId ? roleByOrgId.get(site.organizationId) : undefined;
    if (!orgRole) return null;
    const gatedRow = gatedRowByOrgId.get(site.organizationId!);
    if (!gatedRow) return { ...site, accessRole: orgRole };
    const role = grants
      ? memberSiteRole(grants, site.siteId, {
          role: orgRole,
          hasRestrictedSiteAccess: gatedRow.hasRestrictedSiteAccess,
        })
      : null;
    return role ? { ...site, accessRole: role } : null;
  };
  const accessible: AccessibleSite[] = [];
  for (const site of eagerSites) {
    const entry = withRole(site);
    if (entry) accessible.push(entry);
  }

  if (grants && restrictedOrgIds.length > 0) {
    const candidateSiteIds = restrictedMemberSiteIds(grants);
    if (candidateSiteIds.length > 0) {
      const grantedSites = await db
        .select()
        .from(sites)
        .where(and(inArray(sites.siteId, candidateSiteIds), inArray(sites.organizationId, restrictedOrgIds)));
      const seen = new Set(accessible.map(site => site.siteId));
      for (const site of grantedSites) {
        if (seen.has(site.siteId)) continue;
        const entry = withRole(site);
        if (entry) accessible.push(entry);
      }
    }
  }

  return accessible;
}
