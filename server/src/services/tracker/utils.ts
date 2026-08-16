import UAParser, { UAParser as userAgentParser } from "ua-parser-js";
import { userIdService } from "../userId/userIdService.js";
import type { TrackingRequest } from "./trackingRequest.js";
import { TrackingPayload } from "./types.js";

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

// ua-parser-js is regex-heavy and runs on every event. User-agent strings repeat
// constantly across requests, so memoize parsing in a bounded LRU-ish cache to
// keep this off the per-event hot path.
const UA_CACHE_MAX = 10_000;
const uaCache = new Map<string, UAParser.IResult>();

export function parseUserAgent(userAgent: string): UAParser.IResult {
  const cached = uaCache.get(userAgent);
  if (cached) {
    // Refresh recency: re-insert so frequently-seen UAs survive eviction.
    uaCache.delete(userAgent);
    uaCache.set(userAgent, cached);
    return cached;
  }

  const result = userAgentParser(userAgent);
  uaCache.set(userAgent, result);
  if (uaCache.size > UA_CACHE_MAX) {
    // Evict the oldest (least recently used) entry.
    const oldest = uaCache.keys().next().value;
    if (oldest !== undefined) uaCache.delete(oldest);
  }
  return result;
}

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

/**
 * Build the queued event from an already-resolved Tracking Request.
 *
 * Identity, IP, user agent and the Site Configuration all arrive resolved —
 * this does not re-derive any of them, so the fingerprint hashed here is by
 * construction the same one bot detection and exclusion matching just saw.
 */
export async function createBasePayload(trackingRequest: TrackingRequest): Promise<TotalTrackingPayload> {
  const { payload, site, ipAddress, userAgent } = trackingRequest;
  const { ip_address: _ipAddressOverride, user_agent: _userAgentOverride, ...payloadBody } = payload;

  const anonymousId = payload.anonymous_id
    ? await userIdService.generateUserIdFromClientId(payload.anonymous_id, site.siteId, {
        saltUserIds: site.saltUserIds,
        receivedAt: trackingRequest.receivedAt,
      })
    : await userIdService.generateUserId(ipAddress, userAgent, site.siteId, {
        saltUserIds: site.saltUserIds,
        lookupAsn: trackingRequest.lookupAsn,
        receivedAt: trackingRequest.receivedAt,
      });

  // userId is always the device fingerprint
  // identifiedUserId is the custom user ID when provided, empty string otherwise
  const identifiedUserId = payload.user_id ? payload.user_id.trim() : "";

  return {
    ...payloadBody,
    site_id: site.siteId, // Use the numeric site ID
    hostname: payload.hostname || "",
    pathname: payload.pathname || "",
    querystring: payload.querystring || "",
    screenWidth: payload.screenWidth || 0,
    screenHeight: payload.screenHeight || 0,
    language: payload.language || "",
    page_title: payload.page_title || "",
    referrer: payload.referrer || "",
    type: payload.type,
    ipAddress: ipAddress,
    timestamp: trackingRequest.receivedAt.toISOString(),
    ua: parseUserAgent(userAgent),
    userAgent,
    userId: anonymousId, // Always the device fingerprint
    identifiedUserId: identifiedUserId, // Custom user ID when identified
    storeIp: site.trackIp,
  } as any;
}
