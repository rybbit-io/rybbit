import { FastifyReply, FastifyRequest } from "fastify";
import { sql } from "drizzle-orm";
import { db } from "../../db/postgres/postgres.js";
import { sites } from "../../db/postgres/schema.js";
import { getSessionFromReq } from "../../lib/auth-utils.js";
import { siteConfig } from "../../lib/siteConfig.js";

export async function addSite(
  request: FastifyRequest<{
    Body: {
      domains: string;
      name?: string;
      organizationId: string;
      public?: boolean;
      saltUserIds?: boolean;
      blockBots?: boolean;
    };
  }>,
  reply: FastifyReply
) {
  const {
    domains: domainsInput,
    name: providedName,
    organizationId,
    public: isPublic,
    saltUserIds,
    blockBots,
  } = request.body;

  // Parse comma-separated domains and validate each one
  const domains = domainsInput
    .split(",")
    .map((d) => d.trim())
    .filter((d) => d.length > 0);

  if (domains.length === 0) {
    return reply.status(400).send({
      error: "At least one domain is required",
    });
  }

  // Validate domain format using regex
  const domainRegex =
    /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

  for (const domain of domains) {
    if (!domainRegex.test(domain)) {
      return reply.status(400).send({
        error: `Invalid domain format: ${domain}. Must be a valid domain like example.com or sub.example.com`,
      });
    }
  }

  // Use provided name or default to first domain
  const siteName = providedName || domains[0];

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

    // Check if any of the domains already exist
    for (const domain of domains) {
      const existingSites = await db
        .select()
        .from(sites)
        .where(sql`${sites.domains} @> ARRAY[${domain}]`);

      if (existingSites.length > 0) {
        return reply.status(400).send({
          error: `Domain ${domain} is already registered to another site`,
        });
      }
    }

    // Create the new site
    const newSite = await db
      .insert(sites)
      .values({
        domains,
        name: siteName,
        createdBy: session.user.id,
        organizationId,
        public: isPublic || false,
        saltUserIds: saltUserIds || false,
        blockBots: blockBots === undefined ? true : blockBots,
      })
      .returning();

    // Site domains are now managed through siteConfig cache

    // Update siteConfig cache with the new site
    siteConfig.addSite(newSite[0].siteId, {
      public: newSite[0].public || false,
      saltUserIds: newSite[0].saltUserIds || false,
      domains: newSite[0].domains,
      blockBots:
        newSite[0].blockBots === undefined ? true : newSite[0].blockBots,
    });

    return reply.status(201).send(newSite[0]);
  } catch (error) {
    console.error("Error adding site:", error);
    return reply.status(500).send({
      error: "Internal server error",
    });
  }
}
