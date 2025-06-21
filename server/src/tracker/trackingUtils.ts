import crypto from "crypto";
import { and, eq } from "drizzle-orm";
import { FastifyRequest } from "fastify";
import UAParser, { UAParser as userAgentParser } from "ua-parser-js";
import { z } from "zod";
import { sitesOverLimit } from "../cron/monthly-usage-checker.js";
import { db } from "../db/postgres/postgres.js";
import { activeSessions } from "../db/postgres/schema.js";
import { trackingPayloadSchema } from "./trackEvent.js";
import { siteConfig } from "../lib/siteConfig.js";
import { TrackingPayload } from "./types.js";

export type TotalTrackingPayload = TrackingPayload & {
  type?: string;
  event_name?: string;
  properties?: string;
  userId: string;
  timestamp: string;
  sessionId: string;
  ua: UAParser.IResult;
  referrer: string;
  ipAddress: string;
};

// Infer type from Zod schema
type ValidatedTrackingPayload = z.infer<typeof trackingPayloadSchema>;

// UTM and URL parameter parsing utilities
export function getUTMParams(querystring: string): Record<string, string> {
  const params: Record<string, string> = {};

  if (!querystring) return params;

  try {
    const searchParams = new URLSearchParams(querystring);

    // Extract UTM parameters
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith("utm_") || key === "gclid" || key === "gad_source") {
        params[key.toLowerCase()] = value.toLowerCase();
      }
    }
  } catch (e) {
    console.error("Error parsing query string:", e);
  }

  return params;
}

// Parse all URL parameters from querystring
export function getAllUrlParams(querystring: string): Record<string, string> {
  const params: Record<string, string> = {};

  if (!querystring) return params;

  // If querystring starts with ?, remove it
  const cleanQuerystring = querystring.startsWith("?")
    ? querystring.substring(1)
    : querystring;

  try {
    const searchParams = new URLSearchParams(cleanQuerystring);
    // Extract all parameters
    for (const [key, value] of searchParams.entries()) {
      params[key.toLowerCase()] = value;
    }
  } catch (e) {
    console.error("Error parsing query string for URL parameters:", e);
  }

  return params;
}

// Clear referrer if it's from the same domain
export function clearSelfReferrer(referrer: string, hostname: string): string {
  if (!referrer || !hostname) return referrer;

  try {
    const referrerUrl = new URL(referrer);
    if (referrerUrl.hostname === hostname) {
      // Internal navigation, clear the referrer
      return "";
    }
  } catch (e) {
    // Invalid URL, return original referrer
  }

  return referrer;
}

// Check if site is over the monthly limit
export function isSiteOverLimit(siteId: number | string): boolean {
  return sitesOverLimit.has(Number(siteId));
}

// Get existing user session
export async function getExistingSession(userId: string, siteId: string) {
  const siteIdNumber = parseInt(siteId, 10); // Ensure siteId is a number for the query

  const [existingSession] = await db
    .select()
    .from(activeSessions)
    .where(
      and(
        eq(activeSessions.userId, userId),
        eq(activeSessions.siteId, siteIdNumber)
      )
    )
    .limit(1);

  return existingSession || null; // Return the session or null if not found
}

// Create base tracking payload from request
export function createBasePayload(
  request: FastifyRequest,
  eventType: "pageview" | "custom_event" | "performance" | "error" = "pageview",
  validatedBody: ValidatedTrackingPayload
): TotalTrackingPayload {
  // Use custom user agent if provided, otherwise fall back to header
  const userAgent =
    validatedBody.user_agent || request.headers["user-agent"] || "";
  // Override IP if provided in payload
  const ipAddress = validatedBody.ip_address || getIpAddress(request);
  const siteId = validatedBody.site_id;

  // Use custom user ID if provided, otherwise generate one
  const userId = validatedBody.user_id
    ? validatedBody.user_id.trim()
    : getUserId(ipAddress, userAgent, siteId);

  return {
    ...validatedBody,
    hostname: validatedBody.hostname || "",
    pathname: validatedBody.pathname || "",
    querystring: validatedBody.querystring || "",
    screenWidth: validatedBody.screenWidth || 0,
    screenHeight: validatedBody.screenHeight || 0,
    language: validatedBody.language || "",
    page_title: validatedBody.page_title || "",
    referrer: validatedBody.referrer || "",
    type: eventType,
    ipAddress: ipAddress,
    timestamp: new Date().toISOString(),
    ua: userAgentParser(userAgent),
    userId: userId,
    sessionId: crypto.randomUUID(), // Will be replaced if session exists
  };
}

let cachedSalt: string | null = null;
let cacheDate: string | null = null; // Store the date the salt was generated for (YYYY-MM-DD format)

/**
 * Generates a deterministic daily salt based on a secret environment variable.
 * The salt remains the same for the entire UTC day and changes automatically
 * when the UTC date changes. Caches the salt in memory for efficiency.
 *
 * @throws {Error} If the BETTER_AUTH_SECRET environment variable is not set.
 * @returns {string} The daily salt as a hex string.
 */
function getDailySalt(): string {
  const secretKey = process.env.BETTER_AUTH_SECRET;

  if (!secretKey) {
    console.error(
      "FATAL: BETTER_AUTH_SECRET environment variable is not set. User ID generation will be insecure or fail."
    );
    throw new Error("BETTER_AUTH_SECRET environment variable is missing.");
  }

  // Use UTC date to ensure consistency across timezones and server restarts
  const currentDate = new Date().toISOString().split("T")[0]; // Gets 'YYYY-MM-DD' in UTC

  // Check if the cached salt is still valid for the current UTC date
  if (cachedSalt && cacheDate === currentDate) {
    return cachedSalt;
  }

  const input = secretKey + currentDate;
  const newSalt = crypto.createHash("sha256").update(input).digest("hex");

  cachedSalt = newSalt;
  cacheDate = currentDate;
  return newSalt;
}

/**
 * Generate a user ID based on IP and user agent
 * If the site has salting enabled, also includes a daily rotating salt
 *
 * @param ip User's IP address
 * @param userAgent User's user agent string
 * @param siteId The site ID to check for salting configuration
 * @returns A sha256 hash to identify the user
 */
function getUserId(
  ip: string,
  userAgent: string,
  siteId?: string | number
): string {
  // Only apply salt if the site has salting enabled
  if (siteId && siteConfig.shouldSaltUserIds(siteId)) {
    const dailySalt = getDailySalt(); // Get the salt for the current day
    return crypto
      .createHash("sha256")
      .update(ip + userAgent + dailySalt)
      .digest("hex");
  }

  // Otherwise, just hash IP and user agent
  return crypto
    .createHash("sha256")
    .update(ip + userAgent)
    .digest("hex");
}

// Helper function to get IP address
const getIpAddress = (request: FastifyRequest): string => {
  const cfConnectingIp = request.headers["cf-connecting-ip"];
  if (cfConnectingIp && typeof cfConnectingIp === "string") {
    return cfConnectingIp.trim();
  }

  const forwardedFor = request.headers["x-forwarded-for"];
  if (forwardedFor && typeof forwardedFor === "string") {
    const ips = forwardedFor
      .split(",")
      .map((ip) => ip.trim())
      .filter(Boolean);
    if (ips.length > 0) {
      // Return rightmost IP - the last proxy before reaching our server
      // This is the most trustworthy IP in the chain
      return ips[ips.length - 1];
    }
  }

  return request.ip;
};
