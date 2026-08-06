import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/postgres/postgres.js";
import { memberSiteAccess, team, teamMember, teamSiteAccess } from "../db/postgres/schema.js";

/**
 * Filters an organization's sites down to what a member-role user can access.
 *
 * Access is the union of:
 *  - explicit per-member grants (member_site_access) — these always apply,
 *    even to sites gated by a team the member is not on
 *  - sites granted through the member's teams — always additive, regardless
 *    of whether the member has restricted site access
 *  - sites not gated by any team — only when the member is unrestricted
 *
 * Callers must handle admin/owner roles themselves (they bypass filtering).
 */
export async function filterSitesByMemberAccess<T extends { siteId: number }>(
  orgSites: T[],
  organizationId: string,
  userId: string,
  memberId: string,
  hasRestrictedSiteAccess: boolean
): Promise<T[]> {
  const [explicitGrants, teamGated, userTeams] = await Promise.all([
    hasRestrictedSiteAccess
      ? db
          .select({ siteId: memberSiteAccess.siteId })
          .from(memberSiteAccess)
          .where(eq(memberSiteAccess.memberId, memberId))
      : Promise.resolve([]),
    db
      .select({ siteId: teamSiteAccess.siteId })
      .from(teamSiteAccess)
      .innerJoin(team, eq(teamSiteAccess.teamId, team.id))
      .where(eq(team.organizationId, organizationId)),
    db
      .select({ teamId: teamMember.teamId })
      .from(teamMember)
      .innerJoin(team, eq(teamMember.teamId, team.id))
      .where(and(eq(teamMember.userId, userId), eq(team.organizationId, organizationId))),
  ]);

  const explicitSiteIds = new Set(explicitGrants.map(g => g.siteId));
  const teamGatedSiteIds = new Set(teamGated.map(s => s.siteId));

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

  return orgSites.filter(site => {
    if (explicitSiteIds.has(site.siteId) || userTeamSiteIds.has(site.siteId)) {
      return true;
    }
    if (hasRestrictedSiteAccess) {
      return false;
    }
    return !teamGatedSiteIds.has(site.siteId);
  });
}
