import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../../db/postgres/postgres.js";
import { sites } from "../../db/postgres/schema.js";
import { eq } from "drizzle-orm";
import { getUserHasAccessToSite } from "../../lib/auth-utils.js";

const getSiteExcludedIPsSchema = z.object({
  siteId: z.string().min(1),
});

export async function getSiteExcludedIPs(request: FastifyRequest, reply: FastifyReply) {
  try {
    const validationResult = getSiteExcludedIPsSchema.safeParse(request.params);

    if (!validationResult.success) {
      return reply.status(400).send({
        success: false,
        error: "Invalid site ID",
        details: validationResult.error.flatten(),
      });
    }

    const { siteId } = validationResult.data;
    const numericSiteId = Number(siteId);

    // Validate that siteId is a valid integer
    if (!Number.isInteger(numericSiteId) || isNaN(numericSiteId) || numericSiteId <= 0) {
      return reply.status(400).send({
        success: false,
        error: "Invalid site ID: must be a positive integer",
      });
    }

    // Check if user has access to this site
    const hasAccess = await getUserHasAccessToSite(request, numericSiteId);

    if (!hasAccess) {
      return reply.status(403).send({
        success: false,
        error: "Forbidden: You don't have access to this site",
      });
    }

    // Get the excluded IPs from the database
    const site = await db
      .select({
        excludedIPs: sites.excludedIPs,
      })
      .from(sites)
      .where(eq(sites.siteId, numericSiteId))
      .limit(1);

    if (site.length === 0) {
      return reply.status(404).send({
        success: false,
        error: "Site not found",
      });
    }

    const excludedIPs = Array.isArray(site[0].excludedIPs) ? site[0].excludedIPs : [];

    return reply.send({
      success: true,
      excludedIPs,
    });
  } catch (error) {
    console.error("Error getting excluded IPs:", error);
    return reply.status(500).send({
      success: false,
      error: "Failed to get excluded IPs",
    });
  }
}
