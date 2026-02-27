import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { eq } from "drizzle-orm";
import { member, organization, sites, user } from "../../db/postgres/schema.js";
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
        const [organizationMembers, organizationSites] = await Promise.all([
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
        ]);

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
