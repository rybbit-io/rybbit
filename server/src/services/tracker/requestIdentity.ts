import { FastifyRequest } from "fastify";
import { getIpAddress } from "../../utils.js";

interface TrackingIdentityPayload {
  ip_address?: string;
  user_agent?: string;
}

interface TrackingIdentity {
  ipAddress: string;
  userAgent: string;
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
  trustedServerSideIngestion: boolean
): TrackingIdentity {
  const requestIpAddress = getIpAddress(request);
  const requestUserAgent = getRequestUserAgent(request);

  return {
    ipAddress: trustedServerSideIngestion ? payload.ip_address || requestIpAddress : requestIpAddress,
    userAgent: trustedServerSideIngestion ? payload.user_agent || requestUserAgent : requestUserAgent,
  };
}
