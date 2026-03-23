import { eq, and, inArray } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import {
  team,
  teamMember,
  teamSiteAccess,
  sites,
  member,
  user,
} from "../../db/postgres/schema.js";
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

    // Get user's membership in this org
    const memberRecord = userId
      ? await db
          .select({ id: member.id, role: member.role })
          .from(member)
          .where(
            and(
              eq(member.organizationId, organizationId),
              eq(member.userId, userId)
            )
          )
          .limit(1)
      : [];

    const isAdminOrOwner =
      memberRecord.length > 0 &&
      (memberRecord[0].role === "admin" || memberRecord[0].role === "owner");

    // Get all teams in the org
    let teamsData = await db
      .select()
      .from(team)
      .where(eq(team.organizationId, organizationId));

    // If not admin/owner, filter to only teams the user belongs to
    if (!isAdminOrOwner && userId) {
      const userTeamIds = await db
        .select({ teamId: teamMember.teamId })
        .from(teamMember)
        .where(eq(teamMember.userId, userId));

      const userTeamIdSet = new Set(userTeamIds.map((t) => t.teamId));
      teamsData = teamsData.filter((t) => userTeamIdSet.has(t.id));
    }

    if (teamsData.length === 0) {
      return reply.send({ teams: [] });
    }

    const teamIds = teamsData.map((t) => t.id);

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
        })
        .from(teamSiteAccess)
        .innerJoin(sites, eq(teamSiteAccess.siteId, sites.siteId))
        .where(inArray(teamSiteAccess.teamId, teamIds)),
    ]);

    // Build lookup maps
    const membersMap = new Map<
      string,
      { userId: string; userName: string | null; userEmail: string }[]
    >();
    for (const m of membersData) {
      const existing = membersMap.get(m.teamId) || [];
      existing.push({
        userId: m.userId,
        userName: m.userName,
        userEmail: m.userEmail,
      });
      membersMap.set(m.teamId, existing);
    }

    const sitesMap = new Map<
      string,
      { siteId: number; domain: string; name: string }[]
    >();
    for (const s of sitesData) {
      const existing = sitesMap.get(s.teamId) || [];
      existing.push({ siteId: s.siteId, domain: s.domain, name: s.name });
      sitesMap.set(s.teamId, existing);
    }

    return reply.send({
      teams: teamsData.map((t) => ({
        id: t.id,
        name: t.name,
        organizationId: t.organizationId,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        members: membersMap.get(t.id) || [],
        sites: sitesMap.get(t.id) || [],
      })),
    });
  } catch (error) {
    console.error("Error listing teams:", error);
    return reply.status(500).send({ error: "Failed to list teams" });
  }
}
