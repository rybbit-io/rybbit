import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { eq } from "drizzle-orm";
import { member, organization } from "../../db/postgres/schema.js";
import { getSessionFromReq } from "../../lib/auth-utils.js";

export const getUserOrganizations = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const session = await getSessionFromReq(request);

    if (!session?.user.id) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const userOrganizations = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        createdAt: organization.createdAt,
        metadata: organization.metadata,
        role: member.role,
      })
      .from(member)
      .innerJoin(organization, eq(member.organizationId, organization.id))
      .where(eq(member.userId, session?.user.id));

    return reply.send(userOrganizations);
  } catch (error) {
    console.error("Error fetching user organizations:", error);
    return reply.status(500).send("Failed to fetch user organizations");
  }
};
