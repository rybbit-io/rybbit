import { FastifyReply, FastifyRequest } from "fastify";
import { GetGSCStatusRequest } from "./types.js";
import { gscConnections } from "../../db/postgres/schema.js";
import { eq } from "drizzle-orm";
import { getUserHasAccessToSite } from "../../lib/auth-utils.js";
import { db } from "../../db/postgres/postgres.js";
import { logger } from "../../lib/logger/logger.js";

/**
 * Checks if a site has an active GSC connection
 */
export async function getGSCStatus(req: FastifyRequest<GetGSCStatusRequest>, res: FastifyReply) {
  try {
    const { site } = req.params;
    const siteId = Number(site);

    if (isNaN(siteId)) {
      return res.status(400).send({ error: "Invalid site ID" });
    }

    // Check if user has access to this site
    const hasAccess = await getUserHasAccessToSite(req, siteId);
    if (!hasAccess) {
      return res.status(403).send({ error: "Access denied" });
    }

    const [connection] = await db.select().from(gscConnections).where(eq(gscConnections.siteId, siteId));

    if (!connection) {
      return res.send({
        connected: false,
        gscPropertyUrl: null,
      });
    }

    return res.send({
      connected: true,
      gscPropertyUrl: connection.gscPropertyUrl,
    });
  } catch (error) {
    logger.error(error, "Error checking GSC status");
    return res.status(500).send({ error: "Failed to check GSC status" });
  }
}
