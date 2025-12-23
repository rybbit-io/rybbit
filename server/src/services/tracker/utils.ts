import { FastifyRequest } from "fastify";
import UAParser, { UAParser as userAgentParser } from "ua-parser-js";
import { z } from "zod";
import { getIpAddress } from "../../utils.js";
import { userIdService } from "../userId/userIdService.js";
import { trackingPayloadSchema } from "./trackEvent.js";
import { TrackingPayload } from "./types.js";
import { SiteConfigData } from "../../lib/siteConfig.js";

export type TotalTrackingPayload = TrackingPayload & {
  userId: string; // Always the device fingerprint (same as anonymousId)
  anonymousId: string; // Always the hash of IP+UserAgent (device fingerprint)
  identifiedUserId: string; // Custom user ID when identified, empty string otherwise
  timestamp: string;
  type?: string;
  event_name?: string;
  properties?: string;
  ua: UAParser.IResult;
  referrer: string;
  ipAddress: string;
  storeIp?: boolean;
  lcp?: number;
  cls?: number;
  inp?: number;
  fcp?: number;
  ttfb?: number;
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
  const cleanQuerystring = querystring.startsWith("?") ? querystring.substring(1) : querystring;

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

// Create base tracking payload from request
export async function createBasePayload(
  request: FastifyRequest,
  eventType: "pageview" | "custom_event" | "performance" | "error" | "outbound" = "pageview",
  validatedBody: ValidatedTrackingPayload,
  siteConfiguration: SiteConfigData
): Promise<TotalTrackingPayload> {
  // Use custom user agent if provided, otherwise fall back to header
  const userAgent = validatedBody.user_agent || request.headers["user-agent"] || "";
  // Override IP if provided in payload
  const ipAddress = validatedBody.ip_address || getIpAddress(request);

  // Always compute anonymous_id based on IP+UserAgent (device fingerprint)
  const anonymousId = await userIdService.generateUserId(
    ipAddress,
    userAgent,
    siteConfiguration.siteId
  );

  // userId is always the device fingerprint
  // identifiedUserId is the custom user ID when provided, empty string otherwise
  const identifiedUserId = validatedBody.user_id ? validatedBody.user_id.trim() : "";

  return {
    ...validatedBody,
    site_id: siteConfiguration.siteId, // Use the numeric site ID
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
    userId: anonymousId, // Always the device fingerprint
    anonymousId: anonymousId,
    identifiedUserId: identifiedUserId, // Custom user ID when identified
    storeIp: siteConfiguration.trackIp,
  } as any;
}
