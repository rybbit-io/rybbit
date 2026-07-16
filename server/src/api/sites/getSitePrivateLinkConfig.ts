import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { sites } from "../../db/postgres/schema.js";
import { eq } from "drizzle-orm";

export async function getSitePrivateLinkConfig(
  request: FastifyRequest<{ Params: { siteId: string } }>,
  reply: FastifyReply
) {
  try {
    const { siteId } = request.params;
    const parsedSiteId = parseInt(siteId, 10);

    if (isNaN(parsedSiteId)) {
      return reply.status(400).send({ success: false, error: "Invalid site ID" });
    }

    // Get site data
    const site = await db
      .select({
        privateLinkKey: sites.privateLinkKey,
      })
      .from(sites)
      .where(eq(sites.siteId, parsedSiteId))
      .limit(1);

    if (site.length === 0) {
      return reply.status(404).send({ success: false, error: "Site not found" });
    }

    return reply.send({
      success: true,
      data: {
        privateLinkKey: site[0].privateLinkKey,
      },
    });
  } catch (error) {
    console.error("Error getting site private link configuration:", error);
    return reply.status(500).send({
      success: false,
      error: "Failed to get site private link configuration",
    });
  }
}
