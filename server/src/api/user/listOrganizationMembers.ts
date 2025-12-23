import { and, eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { member, user } from "../../db/postgres/schema.js";
import { getSessionFromReq } from "../../lib/auth-utils.js";

interface ListOrganizationMembersRequest {
  Params: {
    organizationId: string;
  };
}

// Define user interface based on schema
interface UserInfo {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export async function listOrganizationMembers(
  request: FastifyRequest<ListOrganizationMembersRequest>,
  reply: FastifyReply
) {
  try {
    const { organizationId } = request.params;

    const session = await getSessionFromReq(request);

    if (!session?.user?.id) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "You must be logged in to access this resource",
      });
    }

    // Check if user is a member of this organization
    const userMembership = await db.query.member.findFirst({
      where: and(eq(member.userId, session.user.id), eq(member.organizationId, organizationId)),
    });

    if (!userMembership) {
      return reply.status(403).send({
        error: "Forbidden",
        message: "You do not have access to this organization",
      });
    }

    // User has access, fetch all members of the organization
    // Use a direct SQL query approach instead of relations
    const organizationMembers = await db
      .select({
        id: member.id,
        role: member.role,
        userId: member.userId,
        organizationId: member.organizationId,
        createdAt: member.createdAt,
        // User fields
        userName: user.name,
        userEmail: user.email,
        userImage: user.image,
        userActualId: user.id,
      })
      .from(member)
      .leftJoin(user, eq(member.userId, user.id))
      .where(eq(member.organizationId, organizationId));

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
