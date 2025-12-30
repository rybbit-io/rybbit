import { FastifyReply, FastifyRequest } from "fastify";
import { GetGSCDataRequest, GSCResponse } from "./types.js";
import { gscConnections } from "../../db/postgres/schema.js";
import { eq } from "drizzle-orm";
import { refreshGSCToken } from "./utils.js";
import { getUserHasAccessToSite } from "../../lib/auth-utils.js";
import { db } from "../../db/postgres/postgres.js";
import countries from "i18n-iso-countries";
import { logger } from "../../lib/logger/logger.js";

/**
 * Fetches data from Google Search Console API with support for multiple dimensions
 */
export async function getGSCData(req: FastifyRequest<GetGSCDataRequest>, res: FastifyReply) {
  try {
    const { site } = req.params;
    const { start_date, end_date, dimension } = req.query;
    const siteId = Number(site);

    if (isNaN(siteId)) {
      return res.status(400).send({ error: "Invalid site ID" });
    }

    if (!start_date || !end_date) {
      return res.status(400).send({ error: "Missing start_date or end_date" });
    }

    if (!dimension) {
      return res.status(400).send({ error: "Missing dimension parameter" });
    }

    // Check if user has access to this site
    const hasAccess = await getUserHasAccessToSite(req, siteId);
    if (!hasAccess) {
      return res.status(403).send({ error: "Access denied" });
    }

    // Get connection
    const [connection] = await db.select().from(gscConnections).where(eq(gscConnections.siteId, siteId));

    if (!connection) {
      return res.status(404).send({ error: "GSC not connected for this site" });
    }

    // Refresh token if needed
    const accessToken = await refreshGSCToken(siteId);
    if (!accessToken) {
      return res.status(500).send({ error: "Failed to refresh access token" });
    }

    // Query GSC API
    const gscResponse = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(connection.gscPropertyUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: start_date,
          endDate: end_date,
          dimensions: [dimension],
          rowLimit: 1000,
        }),
      }
    );

    if (!gscResponse.ok) {
      const errorText = await gscResponse.text();
      logger.error(`GSC API error: ${errorText}`);
      return res.status(gscResponse.status).send({ error: "Failed to fetch GSC data", details: errorText });
    }

    const data: GSCResponse = await gscResponse.json();

    // Transform the response to a simpler format with unified "name" field
    const results = (data.rows || []).map(row => {
      let name = row.keys[0];

      // Convert country codes from alpha-3 to alpha-2 for the "country" dimension
      if (dimension === "country" && name) {
        name = countries.alpha3ToAlpha2(name.toUpperCase()) || name;
      }

      return {
        name,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      };
    });

    return res.send({ data: results });
  } catch (error) {
    logger.error(error, "Error fetching GSC data");
    return res.status(500).send({ error: "Failed to fetch GSC data" });
  }
}
