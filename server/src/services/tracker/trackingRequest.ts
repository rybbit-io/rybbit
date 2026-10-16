import type { FastifyRequest } from "fastify";
import { createAsnLookup, type AsnLookup } from "../../db/geolocation/asn.js";
import { checkApiKey } from "../../lib/auth-utils.js";
import { hasScope } from "../../lib/scopes.js";
import { siteConfig, type SiteConfigData } from "../../lib/siteConfig.js";
import { getRequestUserAgent, parseSDKUserAgent } from "../../utils.js";
import { collectCandidateClientIps, resolveClientIp } from "./resolveClientIp.js";
import type { ValidatedTrackingPayload } from "./trackingPayload.js";

/**
 * One tracking request, fully resolved.
 *
 * Everything downstream of ingestion needs the same handful of facts about a
 * request — who sent it, from where, for which Site — and each of them used to
 * re-derive those facts from the raw `FastifyRequest` on its own. That made the
 * derivations impossible to keep consistent (identity was resolved twice, per
 * different rules) and impossible to test without an HTTP stub.
 *
 * This is that shared value: resolved once at the edge of the handler, then
 * passed by value. It carries no Fastify types, so ingestion can be exercised
 * directly with an object literal.
 */
export interface TrackingRequest {
  /** The event body, already validated. */
  payload: ValidatedTrackingPayload;
  /** Site Configuration for `payload.site_id`, fetched once for the request. */
  site: SiteConfigData;
  /**
   * The authoritative client IP: identity, geolocation and bot detection all
   * use this one. Never re-resolve it from headers downstream.
   */
  ipAddress: string;
  /** The authoritative user agent, under the same rule as `ipAddress`. */
  userAgent: string;
  /**
   * Every plausible client IP for this request (edge, forwarded hops, socket).
   * Exclusion matching only — over-matching is the safe failure mode there.
   */
  candidateIps: string[];
  /**
   * A bearer token with `ingest:write` scope for this Site let the payload
   * override IP and user agent. Bot detection is skipped for these.
   */
  trustedServerSideIngestion: boolean;
  /** Request headers, for the layers that read beyond the user agent. */
  headers: FastifyRequest["headers"];
  /** Request-scoped ASN resolver: each IP is looked up at most once per event. */
  lookupAsn: AsnLookup;
  /**
   * When the request arrived. This is the event's timestamp *and* the instant
   * that decides which UTC day its salted fingerprint belongs to, so the two can
   * never disagree about the day.
   */
  receivedAt: Date;
}

/**
 * Whether a bearer token authorises this request to declare its own client IP
 * and user agent.
 *
 * An under-scoped bearer degrades to untrusted client-side traffic (no 4xx) —
 * this is a public ingestion endpoint, not an authenticated API.
 */
async function isTrustedServerSideIngestion(request: FastifyRequest, siteId: number): Promise<boolean> {
  const authHeader = request.headers["authorization"];
  if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const apiKeyResult = await checkApiKey(request, { siteId });
  return apiKeyResult.valid && hasScope(apiKeyResult.statements, { resource: "ingest", action: "write" });
}

/**
 * Resolve a validated payload and its HTTP request into a Tracking Request.
 *
 * Returns null when the Site is unknown — the only way resolution fails, and
 * the caller's cue to answer 404.
 */
export async function resolveTrackingRequest(
  request: FastifyRequest,
  payload: ValidatedTrackingPayload
): Promise<TrackingRequest | null> {
  // Stamped before the first await: a cold Site Configuration read or a slow
  // API-key check must not push the event's time forward into another bucket.
  const receivedAt = new Date();

  const site = await siteConfig.getConfig(payload.site_id);
  if (!site) return null;

  const lookupAsn = createAsnLookup();
  const trustedServerSideIngestion = await isTrustedServerSideIngestion(request, site.siteId);

  const requestIpAddress = resolveClientIp(request, { firstPartyProxy: site.firstPartyProxy, lookupAsn });
  const requestUserAgent = getRequestUserAgent(request.headers);

  // Only a trusted bearer may speak for someone else; for everyone else the
  // payload's ip_address/user_agent are ignored rather than trusted.
  //
  // Native SDKs are the exception for the user agent: they describe themselves
  // in the payload because the header is not theirs to set — an HTTP client
  // library sends its own (`Dart/3.9 (dart:io)`), and on web the browser forbids
  // overriding it. Without this an app reports no platform, no OS version and
  // no device type at all.
  //
  // Two conditions, because either one alone is a spoofing hole: the Site must
  // be a mobile one, where no browser traffic is expected in the first place,
  // and the value must parse as an SDK user agent. On a web Site the header
  // stays authoritative, so a page script cannot dress up as a phone to dodge
  // the user-agent side of bot detection.
  const ipAddress = trustedServerSideIngestion ? payload.ip_address || requestIpAddress : requestIpAddress;
  const declaredSdkUserAgent =
    site.type === "mobile" && payload.user_agent && parseSDKUserAgent(payload.user_agent)
      ? payload.user_agent
      : "";
  const userAgent = trustedServerSideIngestion
    ? payload.user_agent || requestUserAgent
    : declaredSdkUserAgent || requestUserAgent;

  return {
    payload,
    site,
    ipAddress,
    userAgent,
    candidateIps: collectCandidateClientIps(request, [ipAddress, requestIpAddress]),
    trustedServerSideIngestion,
    headers: request.headers,
    lookupAsn,
    receivedAt,
  };
}
