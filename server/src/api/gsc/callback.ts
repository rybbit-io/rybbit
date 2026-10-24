import { FastifyReply, FastifyRequest } from "fastify";
import { GSCCallbackRequest } from "./types.js";
import { gscConnections, sites } from "../../db/postgres/schema.js";
import { eq } from "drizzle-orm";
import { getGSCProperties, verifyGSCState } from "./utils.js";
import { getSessionFromReq, getUserHasSitePermission } from "../../lib/auth-utils.js";
import { db } from "../../db/postgres/postgres.js";
import { lockSiteOwnership } from "../sites/applySiteMove.js";

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
      req.log.info({ oauthError: error }, "GSC OAuth was cancelled or failed");
      return res.redirect(`${process.env.BASE_URL}`);
    }

    if (!code || !state) {
      return res.status(400).send({ error: "Missing code or state parameter" });
    }

    // Verify the signed state: this is the only trustworthy source of the target
    // siteId. A tampered/forged/expired state is rejected.
    const statePayload = verifyGSCState(state);
    if (!statePayload) {
      return res.status(400).send({ error: "Invalid or expired state parameter" });
    }
    const { siteId } = statePayload;

    // Get session to retrieve userId
    const session = await getSessionFromReq(req);
    if (!session) {
      return res.status(401).send({ error: "Unauthorized" });
    }

    // The session completing the callback must be the same user that initiated
    // the flow (defends against connection fixation / cross-user state reuse).
    if (session.user.id !== statePayload.userId) {
      return res.status(403).send({ error: "State does not match session" });
    }

    // Read the owner before authorizing: the tokens are only written if the
    // site is still in this organization afterwards (see below).
    const [authorizedSite] = await db
      .select({ organizationId: sites.organizationId })
      .from(sites)
      .where(eq(sites.siteId, siteId))
      .limit(1);

    // Verify the caller actually has admin access to the target site before
    // writing OAuth tokens against it (prevents IDOR / connection hijack).
    const hasAccess = await getUserHasSitePermission(req, siteId, "gsc:write");
    if (!hasAccess) {
      return res.status(403).send({ error: "Access denied" });
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
      req.log.error(
        { responseBody: await tokenResponse.text(), statusCode: tokenResponse.status },
        "GSC token exchange failed"
      );
      return res.redirect(`${process.env.BASE_URL}/error?message=Token exchange failed`);
    }

    const tokens: TokenResponse = await tokenResponse.json();

    // Get available GSC properties
    const properties = await getGSCProperties(tokens.access_token, req.log);

    if (properties.length === 0) {
      return res.redirect(`${process.env.CLIENT_URL}/error?message=No GSC properties found`);
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Store tokens temporarily WITHOUT a property URL
    // We'll update with the selected property after user chooses.
    // The Google round trip above can overlap a site move or transfer, which
    // deletes the connection; writing afterwards would hand this account's
    // properties to the new organization. Write only while the site, locked,
    // is still in the organization the caller was authorized against.
    const stored = await db.transaction(async tx => {
      const site = await lockSiteOwnership(tx, siteId);
      if (!site || !authorizedSite || site.organizationId !== authorizedSite.organizationId) {
        return false;
      }

      const [existingConnection] = await tx.select().from(gscConnections).where(eq(gscConnections.siteId, siteId));

      if (existingConnection) {
        // Update existing connection with new tokens (but keep old property if it exists)
        await tx
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
        await tx.insert(gscConnections).values({
          siteId,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: expiresAt.toISOString(),
          gscPropertyUrl: "PENDING_SELECTION", // Placeholder until user selects
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      return true;
    });

    if (!stored) {
      req.log.warn({ siteId }, "Site changed organization during the GSC callback; tokens not stored");
      return res.redirect(`${process.env.BASE_URL}/error?message=The site moved while connecting Search Console`);
    }

    // Redirect to property selection page with properties as query params
    const propertiesParam = encodeURIComponent(JSON.stringify(properties));
    return res.redirect(`${process.env.BASE_URL}/${siteId}/gsc/select-property?properties=${propertiesParam}`);
  } catch (error) {
    req.log.error(error, "Error handling GSC callback");
    return res.redirect(`${process.env.BASE_URL}/error?message=Callback failed`);
  }
}
