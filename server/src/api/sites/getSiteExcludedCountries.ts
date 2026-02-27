import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../../db/postgres/postgres.js";
import { sites } from "../../db/postgres/schema.js";
import { eq } from "drizzle-orm";

const getSiteExcludedCountriesSchema = z.object({
  siteId: z.string().min(1),
});

export async function getSiteExcludedCountries(request: FastifyRequest, reply: FastifyReply) {
  try {
    const validationResult = getSiteExcludedCountriesSchema.safeParse(request.params);

    if (!validationResult.success) {
      return reply.status(400).send({
        success: false,
        error: "Invalid site ID",
        details: validationResult.error.flatten(),
      });
    }

    const { siteId } = validationResult.data;
    const numericSiteId = Number(siteId);

    const site = await db
      .select({
        excludedCountries: sites.excludedCountries,
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

    const excludedCountries = Array.isArray(site[0].excludedCountries) ? site[0].excludedCountries : [];

    return reply.send({
      success: true,
      excludedCountries,
    });
  } catch (error) {
    console.error("Error getting excluded countries:", error);
    return reply.status(500).send({
      success: false,
      error: "Failed to get excluded countries",
    });
  }
}
