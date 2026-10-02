import type { OrgRole } from "@rybbit/shared";

import type { GetOrganizationMembersResponse } from "@/api/admin/endpoints/auth";
import type { Team } from "@/api/admin/endpoints/teams";
import { isAdminRole, ORG_ROLES } from "@/lib/roles";

// Who can open each of an organization's sites, with what role, and why. This mirrors the server's
// site-access rule (memberSiteRole in server/src/lib/access.ts) so the Teams page can explain it:
//  - owners and admins reach every site with their own role
//  - a site in a team is open only to that team's members, owners and admins, and anyone given the
//    site directly (a member restricted to specific sites)
//  - a site in no team is open to every member who isn't restricted to specific sites
//  - a grant, from a team or direct, raises the member's role on its sites when it names a higher
//    role, and never lowers it

export type AccessMember = Pick<
  GetOrganizationMembersResponse["data"][number],
  "userId" | "role" | "user" | "siteAccess"
>;
export type AccessTeam = Pick<Team, "id" | "name" | "members" | "sites">;
export type AccessSite = { siteId: number; name: string; domain: string };

export type AccessSource = { type: "team"; teamId: string; teamName: string } | { type: "direct" };

export interface ScopedAccess<M extends AccessMember = AccessMember> {
  member: M;
  /** The role they hold on the site: their organization role, raised by any grant naming a higher one. */
  role: string;
  sources: AccessSource[];
}

export interface SiteAccess<T extends AccessTeam = AccessTeam, M extends AccessMember = AccessMember> {
  site: AccessSite;
  /** The teams that hold the site. When there are any, members outside them need a direct grant. */
  teams: T[];
  /** People who reach the site on their organization role alone: owners and admins, and on a site in no team every unrestricted member. Highest role first. */
  broad: M[];
  /** Whether everyone in `broad` also reaches every other site of the organization. */
  broadReachesEverySite: boolean;
  /** People who reach the site through a team or a direct grant. */
  scoped: ScopedAccess<M>[];
}

/** Lower is higher; unknown roles rank below every known one. */
function rank(role: string): number {
  const index = ORG_ROLES.indexOf(role as OrgRole);
  return index === -1 ? ORG_ROLES.length : index;
}

/** The higher of a role and a grant's role; a grant with no role leaves the role as it is. */
export function raiseRole(role: string, granted: string | null | undefined): string {
  return granted && rank(granted) < rank(role) ? granted : role;
}

function teamSitesByUser(teams: AccessTeam[]): Map<string, Set<number>> {
  const byUser = new Map<string, Set<number>>();
  for (const team of teams) {
    for (const member of team.members) {
      const sites = byUser.get(member.userId) ?? new Set<number>();
      team.sites.forEach(site => sites.add(site.siteId));
      byUser.set(member.userId, sites);
    }
  }
  return byUser;
}

export function accessBySite<T extends AccessTeam, M extends AccessMember>(
  sites: AccessSite[],
  members: M[],
  teams: T[]
): SiteAccess<T, M>[] {
  const sitesInTeams = new Set(teams.flatMap(team => team.sites.map(site => site.siteId)));
  const userTeamSites = teamSitesByUser(teams);
  const reachesEverySite = (member: M) =>
    isAdminRole(member.role) || [...sitesInTeams].every(siteId => userTeamSites.get(member.userId)?.has(siteId));
  const byRole = (a: M, b: M) => rank(a.role) - rank(b.role);

  return sites.map(site => {
    const siteTeams = teams.filter(team => team.sites.some(teamSite => teamSite.siteId === site.siteId));
    const inTeam = siteTeams.length > 0;
    const broad: M[] = [];
    const scoped: ScopedAccess<M>[] = [];

    for (const member of members) {
      if (isAdminRole(member.role)) {
        broad.push(member);
        continue;
      }

      const grants: { source: AccessSource; role: string | null }[] = [];
      // Direct grants only count while the member is restricted to specific sites, as on the server.
      if (member.siteAccess.hasRestrictedSiteAccess && member.siteAccess.siteIds.includes(site.siteId)) {
        // siteRole is only the role all of a member's grants share (null when they differ), so read this
        // site's own grant when the members endpoint lists them.
        const grant = member.siteAccess.siteGrants?.find(siteGrant => siteGrant.siteId === site.siteId);
        grants.push({ source: { type: "direct" }, role: grant ? grant.role : member.siteAccess.siteRole });
      }
      for (const team of siteTeams) {
        if (team.members.some(teamMember => teamMember.userId === member.userId)) {
          const role = team.sites.find(teamSite => teamSite.siteId === site.siteId)?.role ?? null;
          grants.push({ source: { type: "team", teamId: team.id, teamName: team.name }, role });
        }
      }

      if (grants.length > 0) {
        scoped.push({
          member,
          role: grants.reduce((role, grant) => raiseRole(role, grant.role), member.role),
          sources: grants.map(grant => grant.source),
        });
      } else if (!member.siteAccess.hasRestrictedSiteAccess && !inTeam) {
        broad.push(member);
      }
    }

    broad.sort(byRole);
    return { site, teams: siteTeams, broad, broadReachesEverySite: broad.every(reachesEverySite), scoped };
  });
}

export interface TeamMemberEffect {
  userId: string;
  name: string;
  /** Their organization role; null when they aren't in the organization's member list. */
  orgRole: string | null;
  /** Owners and admins, who reach every site whatever the team says. */
  hasEverySite: boolean;
  /** The role they hold on the team's sites, with how many of its sites carry it; usually one entry. */
  roles: { role: string; sites: number }[];
  /** How many of the organization's sites outside this team they reach, and how many there are. */
  otherSitesReached: number;
  otherSites: number;
}

/** What a team does for each of its members: the role each ends up with on its sites, given every other grant. */
export function teamMemberEffects(team: AccessTeam, access: SiteAccess[], members: AccessMember[]): TeamMemberEffect[] {
  const memberByUser = new Map(members.map(member => [member.userId, member]));
  const accessBySiteId = new Map(access.map(entry => [entry.site.siteId, entry]));
  const teamSiteIds = new Set(team.sites.map(site => site.siteId));
  const otherSites = access.filter(entry => !teamSiteIds.has(entry.site.siteId));

  return team.members.map(teamMember => {
    const member = memberByUser.get(teamMember.userId);
    const orgRole = member?.role ?? null;
    const hasEverySite = isAdminRole(orgRole);
    const counts = new Map<string, number>();

    if (orgRole) {
      for (const teamSite of team.sites) {
        const role = hasEverySite
          ? orgRole
          : (accessBySiteId.get(teamSite.siteId)?.scoped.find(entry => entry.member.userId === teamMember.userId)
              ?.role ?? raiseRole(orgRole, teamSite.role));
        counts.set(role, (counts.get(role) ?? 0) + 1);
      }
    }

    const reaches = (entry: SiteAccess) =>
      entry.broad.some(person => person.userId === teamMember.userId) ||
      entry.scoped.some(person => person.member.userId === teamMember.userId);

    return {
      userId: teamMember.userId,
      name: teamMember.userName || teamMember.userEmail,
      orgRole,
      hasEverySite,
      roles: [...counts].map(([role, sites]) => ({ role, sites })).sort((a, b) => rank(a.role) - rank(b.role)),
      otherSitesReached: otherSites.filter(reaches).length,
      otherSites: otherSites.length,
    };
  });
}

/** One or two letters for an avatar: the first and last initials of a name, else the email's first letter. */
export function initials(name: string | null | undefined, email: string | null | undefined): string {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length > 0) {
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  }
  return email?.trim()[0]?.toUpperCase() ?? "";
}
