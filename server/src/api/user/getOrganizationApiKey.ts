import { FastifyRequest, FastifyReply } from "fastify";
import { getSessionFromReq } from "../../lib/auth-utils.js";
import { db } from "../../db/postgres/postgres.js";
import { and, or, eq } from "drizzle-orm";
import { member, organization } from "../../db/postgres/schema.js";

interface GetOrganizationApiKeyRequest {
  Params: {
    organizationId: string;
  };
}

export async function getOrganizationApiKey(
  request: FastifyRequest<GetOrganizationApiKeyRequest>,
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

    const userIsAdminOrOwner = await db.query.member.findFirst({
      where: and(
        eq(member.userId, session.user.id),
        eq(member.organizationId, organizationId),
        or(
          eq(member.role, "owner"),
          eq(member.role, "admin"),
        )
      )
    });

    if (!userIsAdminOrOwner) {
      return reply.status(403).send({
        error: "Forbidden",
        message: "You are not an admin or owner of this organization",
      });
    }

    const org = await db.query.organization.findFirst({
      where: eq(organization.id, organizationId)
    });

    if (!org) {
      return reply.status(404).send({ error: "Organization not found" });
    }

    return reply.status(200).send({ apiKey: org.apiKey });
  } catch (error) {
    console.error("Error fetching organization api key:", error);
    return reply.status(500).send({ error: "Internal server error" });
  }
}
