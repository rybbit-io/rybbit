import { FastifyRequest } from "fastify";
import { isIP } from "node:net";
import { getIpAddress } from "../../utils.js";

interface TrackingIdentityPayload {
  ip_address?: string;
  user_agent?: string;
}

export interface TrackingIdentityOptions {
  trustedServerSideIngestion?: boolean;
  trustedFirstPartyProxy?: boolean;
}

interface TrackingIdentity {
  ipAddress: string;
  userAgent: string;
}

function firstHeaderValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }
  return value || null;
}

function normalizeIpCandidate(value: string): string | null {
  const candidate = value.trim().replace(/^"|"$/g, "");
  if (!candidate) {
    return null;
  }

  const bracketedIpv6 = candidate.match(/^\[([^\]]+)](?::\d+)?$/);
  if (bracketedIpv6 && isIP(bracketedIpv6[1])) {
    return bracketedIpv6[1];
  }

  if (isIP(candidate)) {
    return candidate;
  }

  const ipv4WithPort = candidate.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/);
  if (ipv4WithPort && isIP(ipv4WithPort[1])) {
    return ipv4WithPort[1];
  }

  return null;
}

function firstIpFromList(value: string | null): string | null {
  if (!value) {
    return null;
  }

  for (const part of value.split(",")) {
    const ip = normalizeIpCandidate(part);
    if (ip) {
      return ip;
    }
  }

  return null;
}

function firstIpFromForwardedHeader(value: string | null): string | null {
  if (!value) {
    return null;
  }

  for (const forwardedEntry of value.split(",")) {
    for (const param of forwardedEntry.split(";")) {
      const [key, rawValue] = param.split("=");
      if (key?.trim().toLowerCase() !== "for" || !rawValue) {
        continue;
      }

      const ip = normalizeIpCandidate(rawValue);
      if (ip) {
        return ip;
      }
    }
  }

  return null;
}

function getTrustedFirstPartyProxyIpAddress(request: FastifyRequest): string | null {
  const headers = request.headers;

  return (
    normalizeIpCandidate(firstHeaderValue(headers["x-rybbit-client-ip"]) ?? "") ||
    normalizeIpCandidate(firstHeaderValue(headers["true-client-ip"]) ?? "") ||
    normalizeIpCandidate(firstHeaderValue(headers["cloudfront-viewer-address"]) ?? "") ||
    normalizeIpCandidate(firstHeaderValue(headers["x-real-ip"]) ?? "") ||
    firstIpFromList(firstHeaderValue(headers["x-forwarded-for"])) ||
    firstIpFromForwardedHeader(firstHeaderValue(headers.forwarded)) ||
    null
  );
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
  options: TrackingIdentityOptions = {}
): TrackingIdentity {
  const { trustedServerSideIngestion = false, trustedFirstPartyProxy = false } = options;
  const requestIpAddress = getIpAddress(request);
  const requestUserAgent = getRequestUserAgent(request);
  const trustedProxyIpAddress = trustedFirstPartyProxy ? getTrustedFirstPartyProxyIpAddress(request) : null;

  return {
    ipAddress: trustedServerSideIngestion
      ? payload.ip_address || requestIpAddress
      : trustedProxyIpAddress || requestIpAddress,
    userAgent: trustedServerSideIngestion ? payload.user_agent || requestUserAgent : requestUserAgent,
  };
}
