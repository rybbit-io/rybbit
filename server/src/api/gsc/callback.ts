import { FastifyReply, FastifyRequest } from "fastify";
import { GSCCallbackRequest } from "./types.js";
import { gscConnections } from "../../db/postgres/schema.js";
import { eq } from "drizzle-orm";
import { getGSCProperties } from "./utils.js";
import { getSessionFromReq } from "../../lib/auth-utils.js";
import { db } from "../../db/postgres/postgres.js";
import { logger } from "../../lib/logger/logger.js";

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

/**
 * Handles the OAuth callback from Google
 * Exchanges the code for tokens and stores them in the database
 */
export async function gscCallback(req: FastifyRequest<GSCCallbackRequest>, res: FastifyReply) {
  try {
    const { code, state, error } = req.query;

    if (error) {
      logger.info(`OAuth cancelled or failed: ${error}`);
      const siteId = state;
      return res.redirect(`${process.env.BASE_URL}/${siteId}/main`);
    }

    if (!code || !state) {
      return res.status(400).send({ error: "Missing code or state parameter" });
    }

    const siteId = Number(state);
    if (isNaN(siteId)) {
      return res.status(400).send({ error: "Invalid site ID in state" });
    }

    // Get session to retrieve userId
    const session = await getSessionFromReq(req);
    if (!session) {
      return res.status(401).send({ error: "Unauthorized" });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.SERVER_URL}/api/gsc/callback`;

    if (!clientId || !clientSecret) {
      return res.status(500).send({ error: "Google OAuth not configured" });
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      logger.error(`Token exchange failed: ${await tokenResponse.text()}`);
      return res.redirect(`${process.env.BASE_URL}/error?message=Token exchange failed`);
    }

    const tokens: TokenResponse = await tokenResponse.json();

    // Get available GSC properties
    const properties = await getGSCProperties(tokens.access_token);

    if (properties.length === 0) {
      return res.redirect(`${process.env.CLIENT_URL}/error?message=No GSC properties found`);
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Store tokens temporarily WITHOUT a property URL
    // We'll update with the selected property after user chooses
    const [existingConnection] = await db.select().from(gscConnections).where(eq(gscConnections.siteId, siteId));

    if (existingConnection) {
      // Update existing connection with new tokens (but keep old property if it exists)
      await db
        .update(gscConnections)
        .set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: expiresAt.toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(gscConnections.siteId, siteId));
    } else {
      // Create new connection with temporary placeholder
      await db.insert(gscConnections).values({
        siteId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: expiresAt.toISOString(),
        gscPropertyUrl: "PENDING_SELECTION", // Placeholder until user selects
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Redirect to property selection page with properties as query params
    const propertiesParam = encodeURIComponent(JSON.stringify(properties));
    return res.redirect(`${process.env.BASE_URL}/${siteId}/gsc/select-property?properties=${propertiesParam}`);
  } catch (error) {
    logger.error(error, "Error handling GSC callback");
    return res.redirect(`${process.env.BASE_URL}/error?message=Callback failed`);
  }
}
