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
export async function validateApiKey(siteId: string | number, apiKey?: string): Promise<ApiKeyValidationResult> {
  if (!apiKey) {
    return { success: false };
  }

  try {
    const numericSiteId = typeof siteId === "string" ? parseInt(siteId, 10) : siteId;
    const site = await siteConfig.getConfig(numericSiteId);

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
 * Checks if the API key rate limit has been exceeded
 * @param apiKey The API key to check
 * @returns true if the request is allowed, false if rate limit exceeded
 */
export function checkApiKeyRateLimit(apiKey: string): boolean {
  return apiKeyRateLimiter.isAllowed(apiKey);
}
