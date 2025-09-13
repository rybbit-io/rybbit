import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../../db/postgres/postgres.js";
import { sites } from "../../db/postgres/schema.js";
import { siteConfig } from "../../lib/siteConfig.js";
import { validateIPPattern } from "../../lib/ipUtils.js";
import { getUserHasAccessToSite } from "../../lib/auth-utils.js";
import { eq } from "drizzle-orm";

const updateExcludedIPsSchema = z.object({
  siteId: z.string().min(1),
  excludedIPs: z.array(z.string().trim().min(1)).max(100), // Limit to 100 IPs/ranges
});

export async function updateSiteExcludedIPs(request: FastifyRequest, reply: FastifyReply) {
  try {
    const validationResult = updateExcludedIPsSchema.safeParse(request.body);

    if (!validationResult.success) {
      return reply.status(400).send({
        success: false,
        error: "Invalid request data",
        details: validationResult.error.flatten(),
      });
    }

    const { siteId, excludedIPs } = validationResult.data;
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

    // Validate each IP pattern
    const validationErrors: string[] = [];
    for (const ip of excludedIPs) {
      const validation = validateIPPattern(ip);
      if (!validation.valid) {
        validationErrors.push(`${ip}: ${validation.error}`);
      }
    }

    if (validationErrors.length > 0) {
      return reply.status(400).send({
        success: false,
        error: "Invalid IP patterns",
        details: validationErrors,
      });
    }

    // Update the database and cache atomically
    await db.transaction(async (tx) => {
      // Update the database
      await tx
        .update(sites)
        .set({
          excludedIPs: excludedIPs,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(sites.siteId, numericSiteId));

      // Update the cache - if this fails, the transaction will rollback
      siteConfig.updateSiteExcludedIPs(numericSiteId, excludedIPs);
    });

    return reply.send({
      success: true,
      message: "Excluded IPs updated successfully",
      excludedIPs,
    });
  } catch (error) {
    console.error("Error updating excluded IPs:", error);
    return reply.status(500).send({
      success: false,
      error: "Failed to update excluded IPs",
    });
  }
}
