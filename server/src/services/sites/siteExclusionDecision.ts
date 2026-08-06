import { lookupAsn } from "../../db/geolocation/asn.js";
import { getLocation } from "../../db/geolocation/geolocation.js";
import { matchesCIDR, matchesRange } from "../../lib/ipUtils.js";
import { logger } from "../../lib/logger/logger.js";
import type { SiteConfigData } from "../../lib/siteConfig.js";

type SiteExclusionConfiguration = Pick<
  SiteConfigData,
  | "excludedIPs"
  | "excludedCountries"
  | "excludedPaths"
  | "excludedHostnames"
  | "excludedUserAgents"
  | "excludedASNs"
  | "excludedQueryParams"
>;

export type SiteExclusionRequest = {
  ipAddress: string;
  /**
   * Every plausible client IP for the request (edge, forwarded hops, socket).
   * IP exclusions match against ALL of them, not just the resolved `ipAddress`:
   * exclusion is the one place where over-matching is the safe failure mode, and
   * it keeps "exclude my own IP" working even when IP resolution picks a proxy
   * egress instead of the visitor.
   */
  candidateIps?: string[];
  pathname?: string;
  querystring?: string;
  hostname?: string;
  userAgent?: string;
};

export type SiteExclusionReason = "ip" | "asn" | "country" | "path" | "query_param" | "hostname" | "user_agent";

type SiteExclusionLabel = "IP" | "ASN" | "country" | "path" | "query param" | "hostname" | "user agent";

export type SiteExclusionDecision =
  | { excluded: false }
  | {
      excluded: true;
      reason: SiteExclusionReason;
      label: SiteExclusionLabel;
      value: string;
    };

const ACCEPTED: SiteExclusionDecision = { excluded: false };

function excluded(reason: SiteExclusionReason, label: SiteExclusionLabel, value: string): SiteExclusionDecision {
  return { excluded: true, reason, label, value };
}

function matchesGlob(value: string, pattern: string): boolean {
  const glob = pattern.trim().toLowerCase();
  if (!glob) return false;

  const text = value.toLowerCase();
  let textIndex = 0;
  let globIndex = 0;
  let lastStarGlobIndex = -1;
  let textIndexAfterStar = 0;

  while (textIndex < text.length) {
    if (globIndex < glob.length && glob[globIndex] === text[textIndex]) {
      textIndex++;
      globIndex++;
    } else if (globIndex < glob.length && glob[globIndex] === "*") {
      lastStarGlobIndex = globIndex;
      textIndexAfterStar = textIndex;
      globIndex++;
    } else if (lastStarGlobIndex !== -1) {
      globIndex = lastStarGlobIndex + 1;
      textIndexAfterStar++;
      textIndex = textIndexAfterStar;
    } else {
      return false;
    }
  }

  while (globIndex < glob.length && glob[globIndex] === "*") {
    globIndex++;
  }

  return globIndex === glob.length;
}

function matchesIPPattern(ipAddress: string, pattern: string): boolean {
  try {
    const trimmedPattern = pattern.trim();

    if (!trimmedPattern.includes("/") && !trimmedPattern.includes("-")) {
      return ipAddress === trimmedPattern;
    }

    if (trimmedPattern.includes("/")) {
      return matchesCIDR(ipAddress, trimmedPattern);
    }

    if (trimmedPattern.includes("-")) {
      return matchesRange(ipAddress, trimmedPattern);
    }

    return false;
  } catch (error) {
    logger.warn(error as Error, `Invalid IP pattern: ${pattern}`);
    return false;
  }
}

/** Accepts "13335" or "AS13335" (case-insensitive); returns null for anything else. */
function parseAsnPattern(pattern: string): number | null {
  const match = pattern.trim().match(/^(?:AS)?(\d+)$/i);
  return match ? Number(match[1]) : null;
}

/**
 * Query param patterns are either "name" (excluded when the param is present)
 * or "name=value" (value matched as a case-insensitive glob). Names are
 * matched case-insensitively.
 */
function matchesQueryParams(querystring: string, patterns: string[]): string | null {
  const params = new URLSearchParams(querystring);
  const entries = [...params.entries()];
  if (entries.length === 0) return null;

  for (const pattern of patterns) {
    const trimmed = pattern.trim();
    if (!trimmed) continue;

    const separatorIndex = trimmed.indexOf("=");
    const name = (separatorIndex === -1 ? trimmed : trimmed.slice(0, separatorIndex)).toLowerCase();
    const valueGlob = separatorIndex === -1 ? null : trimmed.slice(separatorIndex + 1);
    if (!name) continue;

    const matched = entries.find(
      ([key, value]) => key.toLowerCase() === name && (valueGlob === null || matchesGlob(value, valueGlob))
    );
    if (matched) {
      return matched[1] === "" ? matched[0] : `${matched[0]}=${matched[1]}`;
    }
  }

  return null;
}

/**
 * Returns the first Site Configuration exclusion matched in this fixed order:
 * IP, ASN, country, path, query param, hostname, then user agent.
 *
 * Like IP exclusions, ASN exclusions match against ALL candidate IPs —
 * over-matching is the safe failure mode here. Geolocation is resolved only
 * when country exclusions exist and no earlier exclusion matched. Lookup
 * failures from the geolocation adapter propagate.
 */
export async function decideSiteExclusion(
  configuration: SiteExclusionConfiguration,
  request: SiteExclusionRequest
): Promise<SiteExclusionDecision> {
  const ipsToCheck = [...new Set([request.ipAddress, ...(request.candidateIps ?? [])])];
  const matchedIp = ipsToCheck.find(ip => configuration.excludedIPs.some(pattern => matchesIPPattern(ip, pattern)));
  if (matchedIp) {
    return excluded("ip", "IP", matchedIp);
  }

  if (configuration.excludedASNs.length > 0) {
    const excludedAsnNumbers = new Set(
      configuration.excludedASNs.map(parseAsnPattern).filter((asn): asn is number => asn !== null)
    );

    for (const ip of ipsToCheck) {
      const asnInfo = lookupAsn(ip);
      if (asnInfo && excludedAsnNumbers.has(asnInfo.asn)) {
        return excluded("asn", "ASN", `AS${asnInfo.asn}`);
      }
    }
  }

  if (configuration.excludedCountries.length > 0) {
    const locations = await getLocation([request.ipAddress]);
    const countryIso = locations[request.ipAddress]?.countryIso;

    if (
      countryIso &&
      configuration.excludedCountries.some(country => country.toUpperCase() === countryIso.toUpperCase())
    ) {
      return excluded("country", "country", countryIso);
    }
  }

  const { pathname, querystring, hostname, userAgent } = request;

  if (pathname && configuration.excludedPaths.some(pattern => matchesGlob(pathname, pattern))) {
    return excluded("path", "path", pathname);
  }

  if (querystring && configuration.excludedQueryParams.length > 0) {
    const matchedParam = matchesQueryParams(querystring, configuration.excludedQueryParams);
    if (matchedParam) {
      return excluded("query_param", "query param", matchedParam);
    }
  }

  if (hostname && configuration.excludedHostnames.some(pattern => matchesGlob(hostname, pattern))) {
    return excluded("hostname", "hostname", hostname);
  }

  if (userAgent) {
    const normalizedUserAgent = userAgent.toLowerCase();
    const matchesUserAgent = configuration.excludedUserAgents.some(substring => {
      const trimmed = substring.trim().toLowerCase();
      return trimmed.length > 0 && normalizedUserAgent.includes(trimmed);
    });

    if (matchesUserAgent) {
      return excluded("user_agent", "user agent", userAgent);
    }
  }

  return ACCEPTED;
}
