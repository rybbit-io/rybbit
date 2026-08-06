import crypto from "crypto";
import type { FastifyBaseLogger } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { gscConnections } from "../../db/postgres/schema.js";
import { eq } from "drizzle-orm";
import { SECRET } from "../../lib/const.js";

// How long a signed OAuth state remains valid (15 minutes).
const GSC_STATE_TTL_MS = 15 * 60 * 1000;

interface GSCStatePayload {
  siteId: number;
  userId: string;
  ts: number;
}

function gscStateSecret(): string {
  if (!SECRET) {
    throw new Error("BETTER_AUTH_SECRET is not set; cannot sign GSC OAuth state");
  }
  return SECRET;
}

/**
 * Create a signed, tamper-proof OAuth `state` value binding the flow to the
 * initiating user and the target site. Prevents the callback from trusting an
 * attacker-supplied siteId (IDOR) and mitigates OAuth CSRF / connection fixation.
 */
export function signGSCState(siteId: number, userId: string): string {
  const payload: GSCStatePayload = { siteId, userId, ts: Date.now() };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", gscStateSecret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

/**
 * Verify a signed OAuth `state` value. Returns the decoded payload if the
 * signature is valid and not expired, otherwise null.
 */
export function verifyGSCState(state: string): GSCStatePayload | null {
  const parts = state.split(".");
  if (parts.length !== 2) {
    return null;
  }
  const [body, signature] = parts;

  const expected = crypto.createHmac("sha256", gscStateSecret()).update(body).digest("base64url");
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as GSCStatePayload;
    if (
      typeof payload.siteId !== "number" ||
      typeof payload.userId !== "string" ||
      typeof payload.ts !== "number" ||
      Date.now() - payload.ts > GSC_STATE_TTL_MS
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

interface GSCTokens {
  access_token: string;
  refresh_token?: string; // Optional because refresh might not return a new refresh_token
  expires_in: number;
}

/**
 * Refresh the GSC OAuth token if it's expired
 */
export async function refreshGSCToken(siteId: number, requestLogger: FastifyBaseLogger): Promise<string | null> {
  try {
    const [connection] = await db.select().from(gscConnections).where(eq(gscConnections.siteId, siteId));

    if (!connection) {
      return null;
    }

    // Check if token is expired (with 5 minute buffer)
    const expiresAt = new Date(connection.expiresAt);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt > fiveMinutesFromNow) {
      // Token is still valid
      return connection.accessToken;
    }

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
      requestLogger.error(
        { responseBody: await tokenResponse.text(), statusCode: tokenResponse.status },
        "Failed to refresh GSC token"
      );
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
    requestLogger.error(error, "Error refreshing GSC token");
    return null;
  }
}

/**
 * Get available GSC properties for a given access token
 */
export async function getGSCProperties(accessToken: string, requestLogger: FastifyBaseLogger): Promise<string[]> {
  try {
    const response = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      requestLogger.error(
        { responseBody: await response.text(), statusCode: response.status },
        "Failed to fetch GSC properties"
      );
      return [];
    }

    const data = await response.json();
    return data.siteEntry?.map((site: { siteUrl: string }) => site.siteUrl) || [];
  } catch (error) {
    requestLogger.error(error, "Error fetching GSC properties");
    return [];
  }
}
