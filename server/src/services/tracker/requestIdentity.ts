import { FastifyRequest } from "fastify";
import { collectCandidateClientIps, resolveClientIp } from "./resolveClientIp.js";

interface TrackingIdentityPayload {
  ip_address?: string;
  user_agent?: string;
}

interface TrackingIdentity {
  ipAddress: string;
  userAgent: string;
  /** All plausible client IPs for this request — exclusion matching only. */
  candidateIps: string[];
}

export function getRequestUserAgent(request: FastifyRequest): string {
  const userAgentHeader = request.headers["user-agent"];
  if (Array.isArray(userAgentHeader)) {
    return userAgentHeader[0] || "";
  }
  return userAgentHeader || "";
}

export function resolveTrackingIdentity(
  request: FastifyRequest,
  payload: TrackingIdentityPayload,
  trustedServerSideIngestion: boolean,
  firstPartyProxy = false
): TrackingIdentity {
  const requestIpAddress = resolveClientIp(request, { firstPartyProxy });
  const requestUserAgent = getRequestUserAgent(request);

  const ipAddress = trustedServerSideIngestion ? payload.ip_address || requestIpAddress : requestIpAddress;

  return {
    ipAddress,
    userAgent: trustedServerSideIngestion ? payload.user_agent || requestUserAgent : requestUserAgent,
    candidateIps: collectCandidateClientIps(request, [ipAddress, requestIpAddress]),
  };
}
