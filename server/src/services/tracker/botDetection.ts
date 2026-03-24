import { FastifyRequest } from "fastify";
import { BOT_SCORE_THRESHOLD } from "./const.js";

interface BotDetectionResult {
  isBot: boolean;
  score: number;
  reason?: string;
}

// Known bot/scripting framework signatures in User-Agent strings
const BOT_FRAMEWORK_PATTERNS = [
  "python-requests",
  "python-urllib",
  "go-http-client",
  "java/",
  "okhttp",
  "node-fetch",
  "undici",
  "curl/",
  "wget",
  "httpie",
  "scrapy",
  "phantomjs",
  "selenium",
  "puppeteer",
  "playwright",
  "headlesschrome",
  "apache-httpclient",
  "libwww-perl",
  "mechanize",
  "aiohttp",
  "httpx",
  "got/",
  "superagent",
  "postman",
  "insomnia",
];

// Headless browser indicators in UA
const HEADLESS_PATTERNS = ["headlesschrome", "headless", "phantomjs"];

/**
 * Extract Chrome major version from a User-Agent string.
 * Returns null if Chrome version cannot be determined.
 */
function getChromeVersion(ua: string): number | null {
  const match = ua.match(/Chrome\/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Check if the UA claims a modern OS (Windows 10+, macOS 11+).
 */
function claimsModernOS(ua: string): boolean {
  // Windows 10+ reports as "Windows NT 10.0"
  if (/Windows NT (1[0-9]|[2-9][0-9])/.test(ua)) return true;
  // macOS 11+ (Big Sur and later) — reported as "Mac OS X 10_15" or "Mac OS X 11" etc.
  const macMatch = ua.match(/Mac OS X (\d+)[_.](\d+)/);
  if (macMatch) {
    const major = parseInt(macMatch[1], 10);
    if (major >= 11) return true;
    // macOS 10.15+ (Catalina) is still fairly modern
    if (major === 10 && parseInt(macMatch[2], 10) >= 15) return true;
  }
  return false;
}

/**
 * Score-based bot detection using HTTP header heuristics.
 *
 * Supplements the isbot() UA-string check with analysis of headers
 * that real browsers always send but scripting clients typically miss.
 */
export function detectBot(
  request: FastifyRequest,
  userAgent: string
): BotDetectionResult {
  let score = 0;
  const reasons: string[] = [];
  const headers = request.headers;
  const lowerUA = userAgent.toLowerCase();

  // 1. Known bot framework signatures in UA (instant kill)
  for (const pattern of BOT_FRAMEWORK_PATTERNS) {
    if (lowerUA.includes(pattern)) {
      return {
        isBot: true,
        score: 5,
        reason: `bot_framework:${pattern}`,
      };
    }
  }

  // 2. Headless browser patterns in UA
  for (const pattern of HEADLESS_PATTERNS) {
    if (lowerUA.includes(pattern)) {
      score += 3;
      reasons.push(`headless:${pattern}`);
      break;
    }
  }

  // 3. Missing Accept-Language header — every real browser sends this
  if (!headers["accept-language"]) {
    score += 3;
    reasons.push("missing_accept_language");
  }

  // 4. Missing Accept header
  if (!headers["accept"]) {
    score += 2;
    reasons.push("missing_accept");
  }

  // 5. Missing Accept-Encoding or no gzip support
  const acceptEncoding = headers["accept-encoding"];
  if (!acceptEncoding) {
    score += 2;
    reasons.push("missing_accept_encoding");
  } else if (
    typeof acceptEncoding === "string" &&
    !acceptEncoding.includes("gzip")
  ) {
    score += 2;
    reasons.push("no_gzip_support");
  }

  // 6. Missing sec-fetch-site when UA claims Chrome 76+ (which always sends fetch metadata)
  const chromeVersion = getChromeVersion(userAgent);
  if (chromeVersion && chromeVersion >= 76) {
    if (!headers["sec-fetch-site"]) {
      score += 2;
      reasons.push("missing_sec_fetch_site");
    }

    // 7. sec-fetch-mode mismatch — browser fetch() to /api/track uses "cors" mode, not "navigate"
    const secFetchMode = headers["sec-fetch-mode"];
    if (secFetchMode === "navigate") {
      score += 2;
      reasons.push("sec_fetch_mode_navigate");
    }
  }

  // 8. Stale Chrome version (< 80) claiming modern OS
  if (chromeVersion && chromeVersion < 80 && claimsModernOS(userAgent)) {
    score += 2;
    reasons.push("stale_chrome_version");
  }

  return {
    isBot: score >= BOT_SCORE_THRESHOLD,
    score,
    reason: reasons.length > 0 ? reasons.join(",") : undefined,
  };
}
