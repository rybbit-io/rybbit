import { siteConfig } from "./lib/siteConfig.js";
import * as psl from "psl";
import UAParser from "ua-parser-js";

export function getDeviceType(
  screenWidth: number,
  screenHeight: number,
  ua: UAParser.IResult
): string {
  // if (ua.device) {
  //   if (ua.device.type === "mobile") {
  //     return "Mobile";
  //   } else if (ua.device.type === "tablet") {
  //     return "Tablet";
  //   } else if (ua.device.type === "console") {
  //     return "Console";
  //   } else if (ua.device.type === "smarttv") {
  //     return "TV";
  //   } else if (ua.device.type === "wearable") {
  //     return "Wearable";
  //   } else if (ua.device.type === "embedded") {
  //     return "Embedded";
  //   } else if (ua.device.type === "xr") {
  //     return "XR";
  //   }
  // }

  // if (ua.os.name) {
  //   if (desktopOS.has(ua.os.name)) {
  //     return "Desktop";
  //   } else if (mobileOS.has(ua.os.name)) {
  //     return "Mobile";
  //   } else if (tvOS.has(ua.os.name)) {
  //     return "TV";
  //   } else if (gamingOS.has(ua.os.name)) {
  //     return "Console";
  //   }
  // }

  const largerDimension = Math.max(screenWidth, screenHeight);
  const smallerDimension = Math.min(screenWidth, screenHeight);
  if (largerDimension > 1024) {
    return "Desktop";
  } else if (largerDimension > 768 && smallerDimension > 1024) {
    return "Tablet";
  }
  return "Mobile";
}

// Check if a site is public
export const isSitePublic = async (siteId: string | number) => {
  try {
    // Ensure the siteConfig cache is initialized
    await siteConfig.ensureInitialized();

    // Use the cached value
    return siteConfig.isSitePublic(siteId);
  } catch (err) {
    console.error("Error checking if site is public:", err);
    return false;
  }
};

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
