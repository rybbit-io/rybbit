import { FastifyRequest } from "fastify";
import { lookupAsn } from "../../db/geolocation/asn.js";
import { getIpAddress } from "../../utils.js";
import { isDatacenterAsn } from "./botBlocking/datacenterAsns.js";

/**
 * ASN-aware client IP resolution — the durable successor to `getIpAddress`.
 *
 * The problem `getIpAddress` can't solve: no static header precedence is correct
 * for both topologies at once.
 *
 *   - Direct Cloudflare path  — `CF-Connecting-IP` is the real visitor and is
 *     non-spoofable; the forwarded headers are client-controllable noise.
 *   - First-party proxy path  — a customer fronts Rybbit with CloudFront / Fastly
 *     / nginx, so `CF-Connecting-IP` is the *proxy's* egress node and the visitor
 *     only survives in `X-Forwarded-For` / `X-Real-IP`.
 *
 * `getIpAddress` resolves this by always preferring the forwarded headers, which
 * fixes proxied customers but lets a direct visitor spoof their own geo.
 *
 * This variant removes that exposure by detecting the topology from the edge IP:
 * if `CF-Connecting-IP` belongs to a hosting/datacenter ASN, a first-party proxy
 * is in front, so we trust the forwarded visitor IP. Otherwise the edge IP is a
 * residential/business visitor and is authoritative — forwarded headers are
 * ignored, so they can't be spoofed.
 *
 * Wired as the default client-IP resolver for tracking ingestion, identify,
 * session replay, and feature-flag evaluation. When no Cloudflare edge is present
 * it delegates to `getIpAddress` (the simple header-precedence primitive).
 * Requires `GeoLite2-ASN.mmdb` (the same DB Layer-4 bot detection uses); see the
 * fallback note on `isProxiedEdge` below for the DB-missing behaviour.
 */

/** First non-empty `X-Forwarded-For` entry, or null. */
function firstForwardedFor(request: FastifyRequest): string | null {
  const forwardedFor = request.headers["x-forwarded-for"];
  if (forwardedFor && typeof forwardedFor === "string") {
    const ips = forwardedFor
      .split(",")
      .map(ip => ip.trim())
      .filter(Boolean);
    if (ips.length > 0) return ips[0];
  }
  return null;
}

function realIpHeader(request: FastifyRequest): string | null {
  const realIp = request.headers["x-real-ip"];
  return realIp && typeof realIp === "string" ? realIp.trim() : null;
}

function cfConnectingIp(request: FastifyRequest): string | null {
  const cfIp = request.headers["cf-connecting-ip"];
  return cfIp && typeof cfIp === "string" ? cfIp.trim() : null;
}

/**
 * Whether the connecting edge IP belongs to hosting/datacenter infrastructure —
 * positive evidence that a first-party proxy sits in front of our edge.
 *
 * Fallback semantics matter: if the ASN DB is unavailable, `lookupAsn` returns
 * null and this returns `false` — i.e. unknown edges are treated as direct and
 * `CF-Connecting-IP` wins. That is the safe default for the (vast) direct
 * majority, but it means proxied customers regress to seeing their proxy IP when
 * the DB is missing. If that trade-off is wrong for your deployment, default this
 * to `true` on a null lookup instead (favouring proxied correctness over
 * direct-path anti-spoofing).
 */
function isProxiedEdge(ip: string): boolean {
  const asn = lookupAsn(ip);
  return isDatacenterAsn(asn?.asn);
}

export function resolveClientIp(
  request: FastifyRequest,
  // Injectable for tests so branching can be exercised without the MaxMind DB.
  proxiedEdge: (ip: string) => boolean = isProxiedEdge
): string {
  const realIp = realIpHeader(request);
  const xffFirst = firstForwardedFor(request);
  const cfIp = cfConnectingIp(request);

  if (cfIp) {
    if (proxiedEdge(cfIp)) {
      // First-party proxy in front: trust the forwarded visitor IP, fall back to
      // the edge IP only if the proxy forwarded nothing.
      return realIp ?? xffFirst ?? cfIp;
    }
    // Direct visitor: the edge IP is authoritative and non-spoofable. Ignore
    // forwarded headers entirely.
    return cfIp;
  }

  // No Cloudflare edge (e.g. self-hosted behind nginx): there's no edge IP to
  // corroborate, so defer to plain header precedence (X-Real-IP, then
  // X-Forwarded-For, then the socket IP).
  return getIpAddress(request);
}
