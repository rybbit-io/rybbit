import { and, eq, inArray } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { member, memberSiteAccess, team, teamMember, user } from "../../db/postgres/schema.js";

interface ListOrganizationMembersRequest {
  Params: {
    organizationId: string;
  };
}

export async function listOrganizationMembers(
  request: FastifyRequest<ListOrganizationMembersRequest>,
  reply: FastifyReply
) {
  try {
    const { organizationId } = request.params;

    const organizationMembers = await db
      .select({
        id: member.id,
        role: member.role,
        userId: member.userId,
        organizationId: member.organizationId,
        createdAt: member.createdAt,
        hasRestrictedSiteAccess: member.hasRestrictedSiteAccess,
        // User fields
        userName: user.name,
        userEmail: user.email,
        userImage: user.image,
        userActualId: user.id,
      })
      .from(member)
      .leftJoin(user, eq(member.userId, user.id))
      .where(eq(member.organizationId, organizationId));

    // Get site access and team memberships for all members
    const memberIds = organizationMembers.map(m => m.id);
    const memberUserIds = organizationMembers.map(m => m.userId);
    const [siteAccessRecords, teamMemberships] = await Promise.all([
      memberIds.length > 0
        ? db
            .select({
              memberId: memberSiteAccess.memberId,
              siteId: memberSiteAccess.siteId,
              role: memberSiteAccess.role,
            })
            .from(memberSiteAccess)
            .where(inArray(memberSiteAccess.memberId, memberIds))
        : Promise.resolve([]),
      memberUserIds.length > 0
        ? db
            .select({
              userId: teamMember.userId,
              teamId: team.id,
              teamName: team.name,
            })
            .from(teamMember)
            .innerJoin(team, eq(teamMember.teamId, team.id))
            .where(and(inArray(teamMember.userId, memberUserIds), eq(team.organizationId, organizationId)))
        : Promise.resolve([]),
    ]);

    // Create maps for quick lookup
    const siteIdsMap = new Map<string, number[]>();
    const siteGrantsMap = new Map<string, { siteId: number; role: string | null }[]>();
    const siteRolesMap = new Map<string, Set<string | null>>();
    for (const record of siteAccessRecords) {
      const existing = siteIdsMap.get(record.memberId) || [];
      existing.push(record.siteId);
      siteIdsMap.set(record.memberId, existing);
      const grants = siteGrantsMap.get(record.memberId) || [];
      grants.push({ siteId: record.siteId, role: record.role });
      siteGrantsMap.set(record.memberId, grants);
      const roles = siteRolesMap.get(record.memberId) || new Set();
      roles.add(record.role);
      siteRolesMap.set(record.memberId, roles);
    }
    // The role every one of a member's grants carries; null when they carry
    // none (the member's organization role applies) or differ.
    const sharedSiteRole = (memberId: string) => {
      const roles = siteRolesMap.get(memberId);
      return roles?.size === 1 ? [...roles][0] : null;
    };

    const teamsMap = new Map<string, { id: string; name: string }[]>();
    for (const record of teamMemberships) {
      const existing = teamsMap.get(record.userId) || [];
      existing.push({ id: record.teamId, name: record.teamName });
      teamsMap.set(record.userId, existing);
    }

    // Transform the results to the expected format
    return reply.send({
      success: true,
      data: organizationMembers.map(m => ({
        id: m.id,
        role: m.role,
        userId: m.userId,
        organizationId: m.organizationId,
        createdAt: m.createdAt,
        user: {
          id: m.userActualId,
          name: m.userName,
          email: m.userEmail,
        },
        siteAccess: {
          hasRestrictedSiteAccess: m.hasRestrictedSiteAccess,
          siteIds: siteIdsMap.get(m.id) || [],
          siteRole: sharedSiteRole(m.id),
          // Each grant's own role, for callers that must resolve a member's role per site.
          siteGrants: siteGrantsMap.get(m.id) || [],
        },
        teams: teamsMap.get(m.userId) || [],
      })),
    });
  } catch (error) {
    request.log.error({ err: error }, "Error listing organization members");
    return reply.status(500).send({
      error: "InternalServerError",
      message: "An error occurred while listing organization members",
    });
  }
}
