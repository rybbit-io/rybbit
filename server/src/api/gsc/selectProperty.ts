import { FastifyReply, FastifyRequest } from "fastify";
import { gscConnections } from "../../db/postgres/schema.js";
import { eq } from "drizzle-orm";
import { getUserHasAdminAccessToSite } from "../../lib/auth-utils.js";
import { db } from "../../db/postgres/postgres.js";
import { getGSCProperties, refreshGSCToken } from "./utils.js";

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

    // Managing the connection is an admin action, consistent with connect/disconnect.
    const hasAccess = await getUserHasAdminAccessToSite(req, numericSiteId);
    if (!hasAccess) {
      return res.status(403).send({ error: "Access denied" });
    }

    // The property must be one the connected Google account actually owns.
    // Accepting an arbitrary string would silently break every later data fetch
    // (Google returns 403 for unowned properties) until the site is reconnected.
    const accessToken = await refreshGSCToken(numericSiteId, req.log);
    if (!accessToken) {
      return res.status(404).send({ error: "GSC connection not found" });
    }

    const availableProperties = await getGSCProperties(accessToken, req.log);
    if (!availableProperties.includes(propertyUrl)) {
      return res.status(400).send({ error: "Selected property is not available for the connected account" });
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
    req.log.error(error, "Error selecting GSC property");
    return res.status(500).send({ error: "Failed to select property" });
  }
}
