import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { sites } from "../../db/postgres/schema.js";
import { loadAllowedDomains } from "../../lib/allowedDomains.js";
import { getSessionFromReq } from "../../lib/auth-utils.js";
import { siteConfig } from "../../lib/siteConfig.js";

export async function addSite(
  request: FastifyRequest<{
    Body: {
      domain: string;
      name: string;
      organizationId: string;
      public?: boolean;
      saltUserIds?: boolean;
      blockBots?: boolean;
    };
  }>,
  reply: FastifyReply
) {
  const {
    domain,
    name,
    organizationId,
    public: isPublic,
    saltUserIds,
    blockBots,
  } = request.body;

  // Validate domain format using regex
  const domainRegex =
    /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  if (!domainRegex.test(domain)) {
    return reply.status(400).send({
      error:
        "Invalid domain format. Must be a valid domain like example.com or sub.example.com",
    });
  }

  try {
    const session = await getSessionFromReq(request);

    if (!session?.user?.id) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "You must be logged in to add a site",
      });
    }

    // Check if the organization exists
    if (!organizationId) {
      return reply.status(400).send({
        error: "Organization ID is required",
      });
    }

    // Check if the user is an owner or admin of the organization
    // First, get the user's role in the organization
    const member = await db.query.member.findFirst({
      where: (member, { and, eq }) =>
        and(
          eq(member.userId, session.user.id),
          eq(member.organizationId, organizationId)
        ),
    });

    if (!member) {
      return reply.status(403).send({
        error: "You are not a member of this organization",
      });
    }

    // Check if the user's role is admin or owner
    if (member.role !== "admin" && member.role !== "owner") {
      return reply.status(403).send({
        error:
          "You must be an admin or owner to add sites to this organization",
      });
    }

    // Create the new site
    const newSite = await db
      .insert(sites)
      .values({
        domain,
        name,
        createdBy: session.user.id,
        organizationId,
        public: isPublic || false,
        saltUserIds: saltUserIds || false,
        blockBots: blockBots === undefined ? true : blockBots,
      })
      .returning();

    // Update allowed domains
    await loadAllowedDomains();

    // Update siteConfig cache with the new site
    siteConfig.addSite(newSite[0].siteId, {
      public: newSite[0].public || false,
      saltUserIds: newSite[0].saltUserIds || false,
      domain: newSite[0].domain,
      blockBots:
        newSite[0].blockBots === undefined ? true : newSite[0].blockBots,
      excludedIPs: Array.isArray(newSite[0].excludedIPs) ? newSite[0].excludedIPs : [],
      apiKey: newSite[0].apiKey,
    });

    return reply.status(201).send(newSite[0]);
  } catch (error) {
    console.error("Error adding site:", error);
    return reply.status(500).send({
      error: "Internal server error",
    });
  }
}
