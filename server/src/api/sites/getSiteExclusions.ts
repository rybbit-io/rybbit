import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../../db/postgres/postgres.js";
import { sites } from "../../db/postgres/schema.js";

const siteParamsSchema = z.object({
  siteId: z.string().min(1),
});

/**
 * Read a single string-array exclusion column for a site and return it under `responseKey`.
 * Shared by the path / hostname / user-agent exclusion GET endpoints.
 */
async function getExclusionColumn(
  request: FastifyRequest,
  reply: FastifyReply,
  column: typeof sites.excludedPaths | typeof sites.excludedHostnames | typeof sites.excludedUserAgents,
  responseKey: string
) {
  try {
    const validationResult = siteParamsSchema.safeParse(request.params);

    if (!validationResult.success) {
      return reply.status(400).send({
        success: false,
        error: "Invalid site ID",
        details: validationResult.error.flatten(),
      });
    }

    const numericSiteId = Number(validationResult.data.siteId);
    if (!Number.isInteger(numericSiteId) || numericSiteId <= 0) {
      return reply.status(400).send({
        success: false,
        error: "Invalid site ID: must be a positive integer",
      });
    }

    const site = await db.select({ value: column }).from(sites).where(eq(sites.siteId, numericSiteId)).limit(1);

    if (site.length === 0) {
      return reply.status(404).send({
        success: false,
        error: "Site not found",
      });
    }

    const value = Array.isArray(site[0].value) ? site[0].value : [];

    return reply.send({
      success: true,
      [responseKey]: value,
    });
  } catch (error) {
    console.error(`Error getting ${responseKey}:`, error);
    return reply.status(500).send({
      success: false,
      error: `Failed to get ${responseKey}`,
    });
  }
}

export function getSiteExcludedPaths(request: FastifyRequest, reply: FastifyReply) {
  return getExclusionColumn(request, reply, sites.excludedPaths, "excludedPaths");
}

export function getSiteExcludedHostnames(request: FastifyRequest, reply: FastifyReply) {
  return getExclusionColumn(request, reply, sites.excludedHostnames, "excludedHostnames");
}

export function getSiteExcludedUserAgents(request: FastifyRequest, reply: FastifyReply) {
  return getExclusionColumn(request, reply, sites.excludedUserAgents, "excludedUserAgents");
}
