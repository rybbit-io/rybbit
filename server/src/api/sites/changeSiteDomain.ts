import { eq, sql } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { sites } from "../../db/postgres/schema.js";
import { getUserHasAdminAccessToSite } from "../../lib/auth-utils.js";
import { siteConfig } from "../../lib/siteConfig.js";

export async function changeSiteDomain(
  request: FastifyRequest<{
    Body: {
      siteId: number;
      domains: string; // comma-separated domains
    };
  }>,
  reply: FastifyReply
) {
  const { siteId, domains: domainsInput } = request.body;

  const userHasAdminAccessToSite = await getUserHasAdminAccessToSite(
    request,
    String(siteId)
  );
  if (!userHasAdminAccessToSite) {
    return reply.status(403).send({ error: "Forbidden" });
  }

  // Parse and validate domains
  const domainsArray = domainsInput
    .split(",")
    .map((domain) => domain.trim())
    .filter((domain) => domain.length > 0);

  if (domainsArray.length === 0) {
    return reply.status(400).send({
      error: "At least one domain is required",
    });
  }

  // Validate domain format using regex
  const domainRegex =
    /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

  for (const domain of domainsArray) {
    if (!domainRegex.test(domain)) {
      return reply.status(400).send({
        error: `Invalid domain format: ${domain}. Must be a valid domain like example.com or sub.example.com`,
      });
    }
  }

  try {
    // Check if site exists and user has permission
    const siteResult = await db
      .select()
      .from(sites)
      .where(eq(sites.siteId, siteId));

    if (siteResult.length === 0) {
      return reply.status(404).send({ error: "Site not found" });
    }

    // Check if any of the new domains already exist in other sites
    for (const domain of domainsArray) {
      const existingSites = await db
        .select()
        .from(sites)
        .where(
          sql`${sites.domains} @> ARRAY[${domain}]::text[] AND ${sites.siteId} != ${siteId}`
        );

      if (existingSites.length > 0) {
        return reply.status(409).send({
          error: `Domain ${domain} is already in use by another site`,
        });
      }
    }

    // Update the site domains
    await db
      .update(sites)
      .set({
        domains: domainsArray,
        name: domainsArray[0], // Use first domain as site name
        updatedAt: new Date(),
      })
      .where(eq(sites.siteId, siteId));

    // Site domains are now managed through siteConfig cache
    siteConfig.updateSiteDomains(siteId, domainsArray);

    return reply.status(200).send({ message: "Domains updated successfully" });
  } catch (err) {
    console.error("Error changing site domains:", err);
    return reply.status(500).send({ error: String(err) });
  }
}
