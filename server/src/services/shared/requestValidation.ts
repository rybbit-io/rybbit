import { createServiceLogger } from "../../lib/logger/logger.js";
import { apiKeyRateLimiter } from "../../lib/rateLimiter.js";
import { siteConfig } from "../../lib/siteConfig.js";
import { normalizeOrigin } from "../../utils.js";
import { DISABLE_ORIGIN_CHECK } from "../tracker/const.js";

const logger = createServiceLogger("request-validation");

/**
 * Result of API key validation
 */
export interface ApiKeyValidationResult {
  success: boolean;
  error?: string;
}

/**
 * Result of origin validation
 */
export interface OriginValidationResult {
  success: boolean;
  error?: string;
}

/**
 * Validates API key for the site
 * @param siteId The site ID from the tracking payload
 * @param apiKey The API key from the payload
 * @returns An object with success status and optional error message
 */
export async function validateApiKey(
  siteId: string | number,
  apiKey?: string
): Promise<ApiKeyValidationResult> {
  if (!apiKey) {
    return { success: false };
  }

  try {
    await siteConfig.ensureInitialized();
    const numericSiteId = typeof siteId === "string" ? parseInt(siteId, 10) : siteId;
    const site = await siteConfig.getSiteConfig(numericSiteId);

    if (!site) {
      return { success: false, error: "Site not found" };
    }

    if (site.apiKey && apiKey === site.apiKey) {
      logger.info({ siteId }, "Valid API key for site");
      return { success: true };
    }

    return { success: false, error: "Invalid API key" };
  } catch (error) {
    logger.error(error, "Error validating API key");
    return { success: false, error: "Failed to validate API key" };
  }
}


/**
 * Validates if the request's origin matches the registered domain for the site
 * @param siteId The site ID from the tracking payload
 * @param requestOrigin The origin header from the request
 * @returns An object with success status and optional error message
 */
export async function validateOrigin(
  siteId: string | number,
  requestOrigin?: string,
): Promise<OriginValidationResult> {
  try {
    // If origin checking is disabled, return success
    if (DISABLE_ORIGIN_CHECK) {
      logger.info(
        { siteId, origin: requestOrigin || "none" },
        "Origin check disabled, allowing request"
      );
      return { success: true };
    }

    // Ensure site config is initialized
    await siteConfig.ensureInitialized();

    // Convert siteId to number
    const numericSiteId = typeof siteId === "string" ? parseInt(siteId, 10) : siteId;

    // Get the site configuration
    const site = await siteConfig.getSiteConfig(numericSiteId);

    if (!site) {
      return {
        success: false,
        error: "Site not found",
      };
    }

    // If no origin header, reject the request
    if (!requestOrigin) {
      return {
        success: false,
        error: "Origin header required",
      };
    }

    try {
      // Get the domain associated with this site
      const siteDomain = site.domain;

      // Normalize domains by removing all subdomain prefixes
      const normalizedOriginHost = normalizeOrigin(requestOrigin);
      const normalizedSiteDomain = normalizeOrigin(`https://${siteDomain}`);

      // Check for exact match first
      if (normalizedOriginHost === normalizedSiteDomain) {
        return { success: true };
      }

      // Always allow subdomains - check if origin is a subdomain of site domain
      if (normalizedOriginHost.endsWith(`.${normalizedSiteDomain}`)) {
        return { success: true };
      }

      // If we get here, neither exact match nor valid subdomain
      return {
        success: false,
        error: `Origin mismatch. Received: ${requestOrigin}`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Invalid origin format: ${requestOrigin}`,
      };
    }
  } catch (error) {
    logger.error(error, "Error validating origin");
    return {
      success: false,
      error: "Internal error validating origin",
    };
  }
}

/**
 * Checks if the API key rate limit has been exceeded
 * @param apiKey The API key to check
 * @returns true if the request is allowed, false if rate limit exceeded
 */
export function checkApiKeyRateLimit(apiKey: string): boolean {
  return apiKeyRateLimiter.isAllowed(apiKey);
}