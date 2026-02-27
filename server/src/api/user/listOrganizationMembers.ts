import { eq, inArray } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { member, memberSiteAccess, user } from "../../db/postgres/schema.js";

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

    // Get site access records for all members
    const memberIds = organizationMembers.map(m => m.id);
    const siteAccessRecords =
      memberIds.length > 0
        ? await db
            .select({
              memberId: memberSiteAccess.memberId,
              siteId: memberSiteAccess.siteId,
            })
            .from(memberSiteAccess)
            .where(inArray(memberSiteAccess.memberId, memberIds))
        : [];

    // Create maps for quick lookup
    const siteIdsMap = new Map<string, number[]>();
    for (const record of siteAccessRecords) {
      const existing = siteIdsMap.get(record.memberId) || [];
      existing.push(record.siteId);
      siteIdsMap.set(record.memberId, existing);
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
        },
      })),
    });
  } catch (error) {
    console.error("Error listing organization members:", error);
    return reply.status(500).send({
      error: "InternalServerError",
      message: "An error occurred while listing organization members",
    });
  }
}
