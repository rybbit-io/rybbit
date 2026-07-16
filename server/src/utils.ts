import { eq } from "drizzle-orm";
import { FastifyRequest } from "fastify";
import * as psl from "psl";
import { db } from "./db/postgres/postgres.js";
import { sites } from "./db/postgres/schema.js";

const desktopOS = new Set([
  "AIX",
  "macOS",
  "Windows",
  "Linux",
  "FreeBSD",
  "OpenBSD",
  "NetBSD",
  "DragonFly",
  "Solaris",
  "Unix",
  "HP-UX",
  "QNX",
  "BeOS",
  "Haiku",
  "OS/2",
  "ArcaOS",
  "OpenVMS",
  "RISC OS",
  "Plan9",
  "Hurd",
  "GNU",
  "Minix",
  "SerenityOS",
  "GhostBSD",
  "PC-BSD",
  "Arch",
  "CentOS",
  "Debian",
  "Deepin",
  "elementary OS",
  "Fedora",
  "Gentoo",
  "Knoppix",
  "Kubuntu",
  "Linpus",
  "Linspire",
  "Mageia",
  "Mandriva",
  "Manjaro",
  "Mint",
  "PCLinuxOS",
  "RedHat",
  "Sabayon",
  "Slackware",
  "SUSE",
  "Ubuntu",
  "Xubuntu",
  "VectorLinux",
  "Zenwalk",
  "Chrome OS",
  "Android-x86",
  "Fuchsia",
]);

const mobileOS = new Set([
  "Android",
  "iOS",
  "watchOS",
  "Windows Phone",
  "Windows Mobile",
  "Windows CE",
  "BlackBerry",
  "Symbian",
  "Palm",
  "Bada",
  "Firefox OS",
  "KaiOS",
  "MeeGo",
  "Maemo",
  "Sailfish",
  "Tizen",
  "WebOS",
  "HarmonyOS",
  "OpenHarmony",
  "RIM Tablet OS",
  "Series40",
  "Ubuntu Touch",
  "Joli",
]);

const tvOS = new Set([
  "Chromecast",
  "Chromecast Android",
  "Chromecast Fuchsia",
  "Chromecast Linux",
  "Chromecast SmartSpeaker",
  "NetTV",
]);

const gamingOS = new Set(["PlayStation", "Xbox", "Nintendo"]);

const embeddedOS = new Set(["Windows IoT", "Contiki", "Raspbian", "Morph OS", "Pico", "NetRange"]);

export function getDeviceType(screenWidth: number, screenHeight: number, ua: UAParser.IResult): string {
  if (ua.os.name) {
    if (desktopOS.has(ua.os.name)) {
      return "Desktop";
    } else if (mobileOS.has(ua.os.name)) {
      return "Mobile";
    } else if (tvOS.has(ua.os.name)) {
      return "TV";
    } else if (gamingOS.has(ua.os.name)) {
      return "Console";
    } else if (embeddedOS.has(ua.os.name)) {
      return "Embedded";
    }
  }

  const largerDimension = Math.max(screenWidth, screenHeight);
  const smallerDimension = Math.min(screenWidth, screenHeight);
  if (largerDimension > 1024) {
    return "Desktop";
  } else if (largerDimension > 768 && smallerDimension > 1024) {
    return "Tablet";
  }
  return "Mobile";
}

// Extract site ID from path
export const extractSiteId = (path: string) => {
  // Remove query parameters if present
  const pathWithoutQuery = path.split("?")[0];

  // Handle route patterns:
  // /route/:site
  // /route/:sessionId/:site
  // /route/:userId/:site
  const segments = pathWithoutQuery.split("/").filter(Boolean);
  if (segments.length >= 2) {
    return segments[segments.length - 1];
  }
  return null;
};

// Cache for string ID to numeric ID lookups to avoid repeated DB queries
const siteIdCache = new Map<string, number>();

// Resolve a site identifier (string ID or numeric ID) to its numeric siteId
// Returns the numeric siteId or null if not found
export const resolveNumericSiteId = async (siteIdentifier: string): Promise<number | null> => {
  // Check cache first
  if (siteIdCache.has(siteIdentifier)) {
    return siteIdCache.get(siteIdentifier)!;
  }

  // Look up the string ID in the database
  try {
    const site = await db.select({ siteId: sites.siteId }).from(sites).where(eq(sites.id, siteIdentifier)).limit(1);

    if (site.length > 0) {
      const numericId = site[0].siteId;
      // Cache the result
      siteIdCache.set(siteIdentifier, numericId);
      return numericId;
    }
  } catch (error) {
    console.error("Error resolving site ID:", error);
  }

  if (/^\d+$/.test(siteIdentifier)) {
    return parseInt(siteIdentifier, 10);
  }

  return null;
};

// Replace site ID in URL path with numeric ID
export const replacePathSiteId = (path: string, numericId: number): string => {
  const [pathPart, queryPart] = path.split("?");
  const segments = pathPart.split("/");

  // Replace the last segment (which is the site ID)
  if (segments.length >= 2) {
    segments[segments.length - 1] = String(numericId);
  }

  return queryPart ? `${segments.join("/")}?${queryPart}` : segments.join("/");
};

// Normalizes a domain/hostname by removing all subdomain prefixes.
// Accepts either a full URL or just a hostname.
export const normalizeOrigin = (input: string): string => {
  try {
    let hostname: string;

    // If input looks like a URL, extract hostname; otherwise treat as hostname
    if (input.includes("://")) {
      hostname = new URL(input).hostname;
    } else {
      hostname = input;
    }

    hostname = hostname.toLowerCase();

    // Handle IP addresses and localhost - return as-is
    if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return hostname;
    }

    // Use Public Suffix List to get the registrable domain
    const parsed = psl.parse(hostname);

    // If parsing failed or no domain found, fall back to simple logic
    if (parsed.error || !parsed.domain) {
      const parts = hostname.split(".");
      if (parts.length < 2) {
        return hostname;
      }
      // Default fallback: take last 2 parts
      return parts.slice(-2).join(".");
    }

    // Return the registrable domain (domain + public suffix)
    return parsed.domain;
  } catch {
    // Fallback for any errors: try simple domain extraction
    try {
      let hostname = input.includes("://") ? new URL(input).hostname : input;
      hostname = hostname.toLowerCase();

      if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
        return hostname;
      }

      const parts = hostname.split(".");
      return parts.length >= 2 ? parts.slice(-2).join(".") : hostname;
    } catch {
      return input;
    }
  }
};

// Helper function to get IP address
//
// NOTE: production request paths resolve client IPs via `resolveClientIp()`
// (resolveClientIp.ts), which wraps this with ASN-based proxy detection. This
// function is the simple header-precedence primitive it falls back to when no
// Cloudflare edge is present, and remains the building block for that decision.
//
// Header precedence is tuned for first-party proxies (Cloudflare Workers, AWS
// CloudFront, Fastly, nginx, ...) that front Rybbit and forward the original
// visitor IP. The hard constraint: when such a proxy sits in front of our
// Cloudflare edge, `CF-Connecting-IP` is the *proxy's* egress IP, not the
// visitor — so it must rank BELOW the forwarded headers, otherwise proxied
// traffic geolocates to the proxy's exit node. (CloudFront, for one, cannot
// forward `X-Real-IP` at all — it's on AWS's origin custom-header denylist —
// so `X-Forwarded-For` is the only channel many proxies have.)
//
// For the non-proxied path these forwarded headers are client-spoofable, which
// only lets a visitor corrupt their own (anonymous) geo — acceptable. See
// resolveClientIp.ts for the ASN-aware variant that removes even that exposure.
export const getIpAddress = (request: FastifyRequest): string => {
  // Priority 1: X-Real-IP. First-party proxies (e.g. nginx, Cloudflare Workers)
  // set this to the single original visitor IP.
  const realIp = request.headers["x-real-ip"];
  if (realIp && typeof realIp === "string") {
    return realIp.trim();
  }

  // Priority 2: X-Forwarded-For - use the first IP, which should be the original
  // client. Ranks above CF-Connecting-IP so proxied traffic is attributed to the
  // visitor rather than the proxy's edge node.
  const forwardedFor = request.headers["x-forwarded-for"];
  if (forwardedFor && typeof forwardedFor === "string") {
    const ips = forwardedFor
      .split(",")
      .map(ip => ip.trim())
      .filter(Boolean);
    if (ips.length > 0) {
      return ips[0];
    }
  }

  // Priority 3: Cloudflare header. Authoritative on the direct Cloudflare-fronted
  // path; only reached when no forwarded header is present.
  const cfConnectingIp = request.headers["cf-connecting-ip"];
  if (cfConnectingIp && typeof cfConnectingIp === "string") {
    return cfConnectingIp.trim();
  }

  return request.ip;
};
