import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { and, eq, inArray } from "drizzle-orm";
import {
  member,
  memberSiteAccess,
  organization,
  sites,
  team,
  teamMember,
  teamSiteAccess,
  user,
} from "../../db/postgres/schema.js";
import { getUserIdFromRequest } from "../../lib/auth-utils.js";

export const getMyOrganizations = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    // First, get all organizations the user is a member of
    const userOrganizations = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        createdAt: organization.createdAt,
        role: member.role,
      })
      .from(member)
      .innerJoin(organization, eq(member.organizationId, organization.id))
      .where(eq(member.userId, userId));

    // For each organization, get all members with user details and sites
    const organizationsWithMembersAndSites = await Promise.all(
      userOrganizations.map(async org => {
        const [organizationMembers, allOrgSites, callerMember] = await Promise.all([
          db
            .select({
              id: member.id,
              role: member.role,
              userId: member.userId,
              organizationId: member.organizationId,
              createdAt: member.createdAt,
              // User fields
              userName: user.name,
              userEmail: user.email,
              userActualId: user.id,
            })
            .from(member)
            .leftJoin(user, eq(member.userId, user.id))
            .where(eq(member.organizationId, org.id)),
          db
            .select({
              siteId: sites.siteId,
              siteUuid: sites.id,
              domain: sites.domain,
              name: sites.name,
              organizationId: sites.organizationId,
              createdBy: sites.createdBy,
              public: sites.public,
              saltUserIds: sites.saltUserIds,
              blockBots: sites.blockBots,
              createdAt: sites.createdAt,
            })
            .from(sites)
            .where(eq(sites.organizationId, org.id)),
          db
            .select({
              id: member.id,
              role: member.role,
              hasRestrictedSiteAccess: member.hasRestrictedSiteAccess,
            })
            .from(member)
            .where(and(eq(member.organizationId, org.id), eq(member.userId, userId)))
            .limit(1),
        ]);

        // Filter sites based on the caller's per-member access restrictions.
        // Admins/owners see everything; restricted members see only their granted
        // sites; regular members are still filtered by team-gated sites.
        let organizationSites = allOrgSites;
        const callerMemberRecord = callerMember[0];

        if (callerMemberRecord?.role === "member") {
          if (callerMemberRecord.hasRestrictedSiteAccess) {
            const accessibleSites = await db
              .select({ siteId: memberSiteAccess.siteId })
              .from(memberSiteAccess)
              .where(eq(memberSiteAccess.memberId, callerMemberRecord.id));
            const accessibleSiteIds = new Set(accessibleSites.map(s => s.siteId));
            organizationSites = organizationSites.filter(s => accessibleSiteIds.has(s.siteId));
          }

          const teamGated = await db
            .select({ siteId: teamSiteAccess.siteId })
            .from(teamSiteAccess)
            .innerJoin(team, eq(teamSiteAccess.teamId, team.id))
            .where(eq(team.organizationId, org.id));
          const teamGatedSiteIds = new Set(teamGated.map(s => s.siteId));

          if (teamGatedSiteIds.size > 0) {
            const userTeams = await db
              .select({ teamId: teamMember.teamId })
              .from(teamMember)
              .innerJoin(team, eq(teamMember.teamId, team.id))
              .where(and(eq(teamMember.userId, userId), eq(team.organizationId, org.id)));
            const userTeamIds = userTeams.map(t => t.teamId);

            const userTeamSiteIds = new Set<number>();
            if (userTeamIds.length > 0) {
              const userTeamSites = await db
                .select({ siteId: teamSiteAccess.siteId })
                .from(teamSiteAccess)
                .where(inArray(teamSiteAccess.teamId, userTeamIds));
              for (const s of userTeamSites) userTeamSiteIds.add(s.siteId);
            }

            organizationSites = organizationSites.filter(
              s => !teamGatedSiteIds.has(s.siteId) || userTeamSiteIds.has(s.siteId)
            );
          }
        }

        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          logo: org.logo,
          createdAt: org.createdAt,
          role: org.role,
          members: organizationMembers.map(m => ({
            id: m.id,
            role: m.role,
            userId: m.userId,
            createdAt: m.createdAt,
            user: {
              id: m.userActualId,
              name: m.userName,
              email: m.userEmail,
            },
          })),
          sites: organizationSites.map(site => ({
            id: String(site.siteId ?? site.siteUuid),
            domain: site.domain,
            name: site.name,
            organizationId: site.organizationId,
            createdBy: site.createdBy,
            public: site.public,
            saltUserIds: site.saltUserIds,
            blockBots: site.blockBots,
            createdAt: site.createdAt,
          })),
        };
      })
    );

    return reply.send(organizationsWithMembersAndSites);
  } catch (error) {
    console.error("Error fetching organizations with members:", error);
    return reply.status(500).send({ error: "Failed to fetch organizations" });
  }
};
