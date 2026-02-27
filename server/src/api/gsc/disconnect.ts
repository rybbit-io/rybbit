import { FastifyReply, FastifyRequest } from "fastify";
import { DisconnectGSCRequest } from "./types.js";
import { gscConnections } from "../../db/postgres/schema.js";
import { eq } from "drizzle-orm";
import { getUserHasAccessToSite } from "../../lib/auth-utils.js";
import { db } from "../../db/postgres/postgres.js";
import { logger } from "../../lib/logger/logger.js";

/**
 * Disconnects a site from Google Search Console
 * Removes the OAuth tokens from the database
 */
export async function disconnectGSC(req: FastifyRequest<DisconnectGSCRequest>, res: FastifyReply) {
  try {
    const { siteId } = req.params;
    const numericSiteId = Number(siteId);

    if (isNaN(numericSiteId)) {
      return res.status(400).send({ error: "Invalid site ID" });
    }

    // Check if user has access to this site
    const hasAccess = await getUserHasAccessToSite(req, numericSiteId);
    if (!hasAccess) {
      return res.status(403).send({ error: "Access denied" });
    }

    // Delete the connection
    await db.delete(gscConnections).where(eq(gscConnections.siteId, numericSiteId));

    return res.send({ success: true });
  } catch (error) {
    logger.error(error, "Error disconnecting GSC");
    return res.status(500).send({ error: "Failed to disconnect GSC" });
  }
}
