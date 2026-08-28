import type { FastifyRequest } from "fastify";
import { createAsnLookup, type AsnLookup } from "../../db/geolocation/asn.js";
import { checkApiKey } from "../../lib/auth-utils.js";
import { hasScope } from "../../lib/scopes.js";
import { siteConfig, type SiteConfigData } from "../../lib/siteConfig.js";
import { getRequestUserAgent } from "../../utils.js";
import { collectCandidateClientIps, resolveClientIp } from "./resolveClientIp.js";

export interface SiteIngestionOverrides {
  site_id: string;
  ip_address?: string;
  user_agent?: string;
}

/**
 * The authoritative request facts shared by every public Site ingestion path.
 * Payload IP and user-agent overrides are accepted only from an ingest:write
 * bearer; identity generation must consume these values rather than the raw
 * request or body.
 */
export interface SiteIngestionContext {
  site: SiteConfigData;
  ipAddress: string;
  userAgent: string;
  candidateIps: string[];
  trustedServerSideIngestion: boolean;
  headers: FastifyRequest["headers"];
  lookupAsn: AsnLookup;
  receivedAt: Date;
}

async function isTrustedServerSideIngestion(request: FastifyRequest, siteId: number): Promise<boolean> {
  const authHeader = request.headers["authorization"];
  if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const apiKeyResult = await checkApiKey(request, { siteId });
  return apiKeyResult.valid && hasScope(apiKeyResult.statements, { resource: "ingest", action: "write" });
}

/** Resolve one public request into the Site Ingestion Context, or null for an unknown Site. */
export async function resolveSiteIngestionContext(
  request: FastifyRequest,
  overrides: SiteIngestionOverrides
): Promise<SiteIngestionContext | null> {
  // Fixed before any I/O so timestamping and daily fingerprint salting cannot
  // disagree if the request crosses midnight while configuration is loading.
  const receivedAt = new Date();
  const site = await siteConfig.getConfig(overrides.site_id);
  if (!site) return null;

  const lookupAsn = createAsnLookup();
  const trustedServerSideIngestion = await isTrustedServerSideIngestion(request, site.siteId);
  const requestIpAddress = resolveClientIp(request, { firstPartyProxy: site.firstPartyProxy, lookupAsn });
  const requestUserAgent = getRequestUserAgent(request.headers);

  const ipAddress = trustedServerSideIngestion ? overrides.ip_address || requestIpAddress : requestIpAddress;
  const userAgent = trustedServerSideIngestion ? overrides.user_agent || requestUserAgent : requestUserAgent;

  return {
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
