import { FastifyReply, FastifyRequest } from "fastify";
import { ConnectGSCRequest } from "./types.js";
import { getUserHasAccessToSite } from "../../lib/auth-utils.js";
import { logger } from "../../lib/logger/logger.js";

/**
 * Initiates the OAuth flow for Google Search Console
 * Returns the OAuth URL to redirect the user to
 */
export async function connectGSC(req: FastifyRequest<ConnectGSCRequest>, res: FastifyReply) {
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

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.SERVER_URL}/api/gsc/callback`;

    if (!clientId) {
      return res.status(500).send({ error: "Google OAuth not configured" });
    }

    // Build OAuth URL
    const scope = "https://www.googleapis.com/auth/webmasters.readonly";
    const state = numericSiteId.toString(); // Pass siteId in state to retrieve after OAuth

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent"); // Force consent to ensure we get refresh token
    authUrl.searchParams.set("state", state);

    return res.send({ authUrl: authUrl.toString() });
  } catch (error) {
    logger.error(error, "Error initiating GSC OAuth");
    return res.status(500).send({ error: "Failed to initiate OAuth" });
  }
}
