import { roleHasPermission } from "@rybbit/shared";
import { eq, inArray } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { team, teamMember, teamSiteAccess, sites, user } from "../../db/postgres/schema.js";
import { effectiveOrgRole, getOrgMembership } from "../../lib/access.js";
import { getUserIdFromRequest } from "../../lib/auth-utils.js";

export async function listTeams(
  request: FastifyRequest<{
    Params: { organizationId: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { organizationId } = request.params;
    const userId = request.user?.id ?? (await getUserIdFromRequest(request));

    // Team managers see every team; everyone else sees the teams they are on.
    const isAdminOrOwner = roleHasPermission(
      effectiveOrgRole(await getOrgMembership(userId, organizationId)),
      "teams:manage"
    );

    // Get all teams in the org
    let teamsData = await db.select().from(team).where(eq(team.organizationId, organizationId));

    // If not admin/owner, filter to only teams the user belongs to
    if (!isAdminOrOwner && userId) {
      const userTeamIds = await db
        .select({ teamId: teamMember.teamId })
        .from(teamMember)
        .where(eq(teamMember.userId, userId));

      const userTeamIdSet = new Set(userTeamIds.map(t => t.teamId));
      teamsData = teamsData.filter(t => userTeamIdSet.has(t.id));
    }

    if (teamsData.length === 0) {
      return reply.send({ teams: [] });
    }

    const teamIds = teamsData.map(t => t.id);

    // Fetch members and sites for all teams in parallel
    const [membersData, sitesData] = await Promise.all([
      db
        .select({
          teamId: teamMember.teamId,
          userId: teamMember.userId,
          userName: user.name,
          userEmail: user.email,
        })
        .from(teamMember)
        .innerJoin(user, eq(teamMember.userId, user.id))
        .where(inArray(teamMember.teamId, teamIds)),
      db
        .select({
          teamId: teamSiteAccess.teamId,
          siteId: sites.siteId,
          domain: sites.domain,
          name: sites.name,
          role: teamSiteAccess.role,
        })
        .from(teamSiteAccess)
        .innerJoin(sites, eq(teamSiteAccess.siteId, sites.siteId))
        .where(inArray(teamSiteAccess.teamId, teamIds)),
    ]);

    // Build lookup maps
    const membersMap = new Map<string, { userId: string; userName: string | null; userEmail: string }[]>();
    for (const m of membersData) {
      const existing = membersMap.get(m.teamId) || [];
      existing.push({
        userId: m.userId,
        userName: m.userName,
        userEmail: m.userEmail,
      });
      membersMap.set(m.teamId, existing);
    }

    const sitesMap = new Map<string, { siteId: number; domain: string; name: string; role: string | null }[]>();
    for (const s of sitesData) {
      const existing = sitesMap.get(s.teamId) || [];
      existing.push({ siteId: s.siteId, domain: s.domain, name: s.name, role: s.role });
      sitesMap.set(s.teamId, existing);
    }
    // The role every one of a team's site grants carries; null when they carry
    // none (each member's organization role applies) or differ.
    const sharedSiteRole = (teamId: string) => {
      const roles = new Set((sitesMap.get(teamId) || []).map(site => site.role));
      return roles.size === 1 ? [...roles][0] : null;
    };

    return reply.send({
      teams: teamsData.map(t => ({
        id: t.id,
        name: t.name,
        organizationId: t.organizationId,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        members: membersMap.get(t.id) || [],
        sites: sitesMap.get(t.id) || [],
        siteRole: sharedSiteRole(t.id),
      })),
    });
  } catch (error) {
    request.log.error({ err: error }, "Error listing teams");
    return reply.status(500).send({ error: "Failed to list teams" });
  }
}
