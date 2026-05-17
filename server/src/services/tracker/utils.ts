import { FastifyRequest } from "fastify";
import UAParser, { UAParser as userAgentParser } from "ua-parser-js";
import { z } from "zod";
import { userIdService } from "../userId/userIdService.js";
import { trackingPayloadSchema } from "./trackEvent.js";
import { TrackingPayload } from "./types.js";
import { SiteConfigData } from "../../lib/siteConfig.js";
import { resolveTrackingIdentity } from "./requestIdentity.js";

export type TotalTrackingPayload = TrackingPayload & {
  userId: string; // Always the device fingerprint
  identifiedUserId: string; // Custom user ID when identified, empty string otherwise
  timestamp: string;
  type?: string;
  event_name?: string;
  properties?: string;
  ua: UAParser.IResult;
  userAgent: string;
  referrer: string;
  ipAddress: string;
  storeIp?: boolean;
  lcp?: number;
  cls?: number;
  inp?: number;
  fcp?: number;
  ttfb?: number;
  tag?: string;
  feature_flags?: Record<string, string>;
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
  eventType:
    | "pageview"
    | "custom_event"
    | "performance"
    | "error"
    | "outbound"
    | "button_click"
    | "copy"
    | "form_submit"
    | "input_change" = "pageview",
  validatedBody: ValidatedTrackingPayload,
  siteConfiguration: SiteConfigData,
  trustedServerSideIngestion = false
): Promise<TotalTrackingPayload> {
  const { ipAddress, userAgent } = resolveTrackingIdentity(request, validatedBody, trustedServerSideIngestion);
  const { ip_address: _ipAddressOverride, user_agent: _userAgentOverride, ...payloadBody } = validatedBody;

  const anonymousId = validatedBody.anonymous_id
    ? await userIdService.generateUserIdFromClientId(validatedBody.anonymous_id, siteConfiguration.siteId)
    : await userIdService.generateUserId(ipAddress, userAgent, siteConfiguration.siteId);

  // userId is always the device fingerprint
  // identifiedUserId is the custom user ID when provided, empty string otherwise
  const identifiedUserId = validatedBody.user_id ? validatedBody.user_id.trim() : "";

  return {
    ...payloadBody,
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
    userAgent,
    userId: anonymousId, // Always the device fingerprint
    identifiedUserId: identifiedUserId, // Custom user ID when identified
    storeIp: siteConfiguration.trackIp,
  } as any;
}
