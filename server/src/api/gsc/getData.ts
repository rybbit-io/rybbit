import { FastifyReply, FastifyRequest } from "fastify";
import { GetGSCDataRequest, GSCResponse } from "./types.js";
import { gscConnections } from "../../db/postgres/schema.js";
import { eq } from "drizzle-orm";
import { refreshGSCToken } from "./utils.js";
import { db } from "../../db/postgres/postgres.js";
import {
  buildSearchAnalyticsRequest,
  describeUpstreamError,
  GSCQueryError,
  mapSearchAnalyticsRows,
  type SearchAnalyticsRequest,
} from "./searchAnalytics.js";

/**
 * Fetches Search Analytics data from Google Search Console. The dashboard
 * sends a single `dimension`; API and MCP callers can also pass `dimensions`
 * (including date), `filters`, `search_type`, `data_state`, `row_limit`, and
 * `start_row`.
 */
export async function getGSCData(req: FastifyRequest<GetGSCDataRequest>, res: FastifyReply) {
  try {
    const { siteId } = req.params;
    const numericSiteId = Number(siteId);

    if (isNaN(numericSiteId)) {
      return res.status(400).send({ error: "Invalid site ID" });
    }

    let request: SearchAnalyticsRequest;
    try {
      request = buildSearchAnalyticsRequest(req.query);
    } catch (error) {
      if (error instanceof GSCQueryError) {
        return res.status(400).send({ error: error.message });
      }
      throw error;
    }

    // Get connection
    const [connection] = await db.select().from(gscConnections).where(eq(gscConnections.siteId, numericSiteId));

    if (!connection) {
      return res.status(404).send({
        error:
          "GSC not connected for this site. Connect Google Search Console in the dashboard under Site settings > Integrations.",
      });
    }

    // Refresh token if needed
    const accessToken = await refreshGSCToken(numericSiteId, req.log);
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
        body: JSON.stringify(request.body),
      }
    );

    if (!gscResponse.ok) {
      const errorText = await gscResponse.text();
      req.log.error({ responseBodyLength: errorText.length, statusCode: gscResponse.status }, "GSC request failed");
      const { status, error } = describeUpstreamError(gscResponse.status, errorText);
      return res.status(status).send({ error, details: errorText });
    }

    const data: GSCResponse = await gscResponse.json();

    return res.send({ data: mapSearchAnalyticsRows(data.rows, request) });
  } catch (error) {
    req.log.error(error, "Error fetching GSC data");
    return res.status(500).send({ error: "Failed to fetch GSC data" });
  }
}
