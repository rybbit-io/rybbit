import { FastifyReply, FastifyRequest } from "fastify";
import { gscConnections } from "../../db/postgres/schema.js";
import { eq } from "drizzle-orm";
import { getUserHasAccessToSite } from "../../lib/auth-utils.js";
import { db } from "../../db/postgres/postgres.js";
import { logger } from "../../lib/logger/logger.js";

interface SelectPropertyRequest {
  Params: {
    siteId: string;
  };
  Body: {
    propertyUrl: string;
  };
}

/**
 * Updates the GSC connection with the user-selected property
 */
export async function selectGSCProperty(req: FastifyRequest<SelectPropertyRequest>, res: FastifyReply) {
  try {
    const { siteId } = req.params;
    const { propertyUrl } = req.body;
    const numericSiteId = Number(siteId);

    if (isNaN(numericSiteId)) {
      return res.status(400).send({ error: "Invalid site ID" });
    }

    if (!propertyUrl || propertyUrl === "PENDING_SELECTION") {
      return res.status(400).send({ error: "Property URL is required" });
    }

    // Check if user has access to this site
    const hasAccess = await getUserHasAccessToSite(req, numericSiteId);
    if (!hasAccess) {
      return res.status(403).send({ error: "Access denied" });
    }

    // Update the connection with the selected property
    const result = await db
      .update(gscConnections)
      .set({
        gscPropertyUrl: propertyUrl,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(gscConnections.siteId, numericSiteId))
      .returning();

    if (result.length === 0) {
      return res.status(404).send({ error: "GSC connection not found" });
    }

    return res.send({ success: true, property: propertyUrl });
  } catch (error) {
    logger.error(error, "Error selecting GSC property");
    return res.status(500).send({ error: "Failed to select property" });
  }
}
