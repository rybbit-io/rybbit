import { db } from "../../db/postgres/postgres.js";
import { gscConnections } from "../../db/postgres/schema.js";
import { eq } from "drizzle-orm";
import { logger } from "../../lib/logger/logger.js";

interface GSCTokens {
  access_token: string;
  refresh_token?: string; // Optional because refresh might not return a new refresh_token
  expires_in: number;
}

/**
 * Refresh the GSC OAuth token if it's expired
 */
export async function refreshGSCToken(siteId: number): Promise<string | null> {
  try {
    const [connection] = await db.select().from(gscConnections).where(eq(gscConnections.siteId, siteId));

    if (!connection) {
      return null;
    }

    // Check if token is expired (with 5 minute buffer)
    const expiresAt = new Date(connection.expiresAt);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    // if (expiresAt > fiveMinutesFromNow) {
    //   // Token is still valid
    //   return connection.accessToken;
    // }

    // Token is expired or about to expire, refresh it
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: connection.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenResponse.ok) {
      logger.error(`Failed to refresh GSC token: ${await tokenResponse.text()}`);
      return null;
    }

    const tokens: GSCTokens = await tokenResponse.json();

    // Update the connection with new access token
    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Only update refresh_token if a new one was provided
    const updateData: Partial<typeof gscConnections.$inferInsert> = {
      accessToken: tokens.access_token,
      expiresAt: newExpiresAt.toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (tokens.refresh_token) {
      updateData.refreshToken = tokens.refresh_token;
    }

    await db.update(gscConnections).set(updateData).where(eq(gscConnections.siteId, siteId));

    return tokens.access_token;
  } catch (error) {
    logger.error(error, "Error refreshing GSC token");
    return null;
  }
}

/**
 * Get available GSC properties for a given access token
 */
export async function getGSCProperties(accessToken: string): Promise<string[]> {
  try {
    const response = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      logger.error(`Failed to fetch GSC properties: ${await response.text()}`);
      return [];
    }

    const data = await response.json();
    return data.siteEntry?.map((site: { siteUrl: string }) => site.siteUrl) || [];
  } catch (error) {
    logger.error(error, "Error fetching GSC properties");
    return [];
  }
}
