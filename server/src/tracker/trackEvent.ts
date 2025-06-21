import { FastifyReply, FastifyRequest } from "fastify";
import { z, ZodError } from "zod";
import { isbot } from "isbot";
import {
  clearSelfReferrer,
  createBasePayload,
  getExistingSession,
  isSiteOverLimit,
  TotalTrackingPayload,
} from "./trackingUtils.js";
import { db } from "../db/postgres/postgres.js";
import { activeSessions } from "../db/postgres/schema.js";
import { eq } from "drizzle-orm";
import { getDeviceType, normalizeOrigin } from "../utils.js";
import { pageviewQueue } from "./pageviewQueue.js";
import { siteConfig } from "../lib/siteConfig.js";
import { DISABLE_ORIGIN_CHECK } from "./const.js";
import { apiKeyRateLimiter } from "../lib/rateLimiter.js";

// Define Zod schema for validation
export const trackingPayloadSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("pageview"),
      site_id: z.string().min(1),
      hostname: z.string().max(253).optional(),
      pathname: z.string().max(2048).optional(),
      querystring: z.string().max(2048).optional(),
      screenWidth: z.number().int().positive().optional(),
      screenHeight: z.number().int().positive().optional(),
      language: z.string().max(35).optional(),
      page_title: z.string().max(512).optional(),
      referrer: z.string().max(2048).optional(),
      event_name: z.string().max(256).optional(),
      properties: z.string().max(2048).optional(),
      user_id: z.string().max(255).optional(),
      api_key: z.string().max(35).optional(), // rb_ prefix + 32 hex chars
      ip_address: z.string().ip().optional(), // Custom IP for geolocation
      user_agent: z.string().max(512).optional(), // Custom user agent
    })
    .strict(),
  z
    .object({
      type: z.literal("custom_event"),
      site_id: z.string().min(1),
      hostname: z.string().max(253).optional(),
      pathname: z.string().max(2048).optional(),
      querystring: z.string().max(2048).optional(),
      screenWidth: z.number().int().positive().optional(),
      screenHeight: z.number().int().positive().optional(),
      language: z.string().max(35).optional(),
      page_title: z.string().max(512).optional(),
      referrer: z.string().max(2048).optional(),
      event_name: z.string().min(1).max(256),
      properties: z
        .string()
        .max(2048)
        .refine(
          (val) => {
            try {
              JSON.parse(val);
              return true;
            } catch (e) {
              return false;
            }
          },
          { message: "Properties must be a valid JSON string" }
        )
        .optional(), // Optional but must be valid JSON if present
      user_id: z.string().max(255).optional(),
      api_key: z.string().max(35).optional(), // rb_ prefix + 32 hex chars
      ip_address: z.string().ip().optional(), // Custom IP for geolocation
      user_agent: z.string().max(512).optional(), // Custom user agent
    })
    .strict(),
  z
    .object({
      type: z.literal("performance"),
      site_id: z.string().min(1),
      hostname: z.string().max(253).optional(),
      pathname: z.string().max(2048).optional(),
      querystring: z.string().max(2048).optional(),
      screenWidth: z.number().int().positive().optional(),
      screenHeight: z.number().int().positive().optional(),
      language: z.string().max(35).optional(),
      page_title: z.string().max(512).optional(),
      referrer: z.string().max(2048).optional(),
      event_name: z.string().max(256).optional(),
      properties: z.string().max(2048).optional(),
      user_id: z.string().max(255).optional(),
      api_key: z.string().max(35).optional(), // rb_ prefix + 32 hex chars
      ip_address: z.string().ip().optional(), // Custom IP for geolocation
      user_agent: z.string().max(512).optional(), // Custom user agent
      // Performance metrics (can be null if not collected)
      lcp: z.number().min(0).nullable().optional(),
      cls: z.number().min(0).nullable().optional(),
      inp: z.number().min(0).nullable().optional(),
      fcp: z.number().min(0).nullable().optional(),
      ttfb: z.number().min(0).nullable().optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("error"),
      site_id: z.string().min(1),
      hostname: z.string().max(253).optional(),
      pathname: z.string().max(2048).optional(),
      querystring: z.string().max(2048).optional(),
      screenWidth: z.number().int().positive().optional(),
      screenHeight: z.number().int().positive().optional(),
      language: z.string().max(35).optional(),
      page_title: z.string().max(512).optional(),
      referrer: z.string().max(2048).optional(),
      event_name: z.string().min(1).max(256), // Error type (TypeError, ReferenceError, etc.)
      properties: z
        .string()
        .max(4096) // Larger limit for error details
        .refine(
          (val) => {
            try {
              const parsed = JSON.parse(val);
              // Validate error-specific properties
              if (typeof parsed.message !== "string") return false;
              if (parsed.stack && typeof parsed.stack !== "string")
                return false;
              if (parsed.fileName && typeof parsed.fileName !== "string")
                return false;
              if (parsed.lineNumber && typeof parsed.lineNumber !== "number")
                return false;
              if (
                parsed.columnNumber &&
                typeof parsed.columnNumber !== "number"
              )
                return false;

              // Apply truncation limits
              if (parsed.message && parsed.message.length > 500) {
                parsed.message = parsed.message.substring(0, 500);
              }
              if (parsed.stack && parsed.stack.length > 2000) {
                parsed.stack = parsed.stack.substring(0, 2000);
              }

              return true;
            } catch (e) {
              return false;
            }
          },
          {
            message:
              "Properties must be valid JSON with error fields (message, stack, fileName, lineNumber, columnNumber)",
          }
        ),
      user_id: z.string().max(255).optional(),
      api_key: z.string().max(35).optional(), // rb_ prefix + 32 hex chars
      ip_address: z.string().ip().optional(), // Custom IP for geolocation
      user_agent: z.string().max(512).optional(), // Custom user agent
    })
    .strict(),
]);

// Update session for both pageviews and events
async function updateSession(
  payload: TotalTrackingPayload,
  existingSession: any | null,
  isPageview: boolean = true
): Promise<void> {
  if (existingSession) {
    // Update session with Drizzle
    const updateData: any = {
      lastActivity: new Date(payload.timestamp),
    };

    // Only increment pageviews count for actual pageviews
    if (isPageview) {
      updateData.pageviews = (existingSession.pageviews || 0) + 1;
    }

    await db
      .update(activeSessions)
      .set(updateData)
      .where(eq(activeSessions.userId, existingSession.userId));
    return;
  }

  // Insert new session with Drizzle
  const insertData = {
    sessionId: payload.sessionId,
    siteId:
      typeof payload.site_id === "string"
        ? parseInt(payload.site_id, 10)
        : payload.site_id,
    userId: payload.userId,
    hostname: payload.hostname || null,
    startTime: new Date(payload.timestamp || Date.now()),
    lastActivity: new Date(payload.timestamp || Date.now()),
    pageviews: isPageview ? 1 : 0,
    entryPage: payload.pathname || null,
    deviceType: getDeviceType(
      payload.screenWidth,
      payload.screenHeight,
      payload.ua
    ),
    screenWidth: payload.screenWidth || null,
    screenHeight: payload.screenHeight || null,
    browser: payload.ua.browser.name || null,
    operatingSystem: payload.ua.os.name || null,
    language: payload.language || null,
    referrer: payload.hostname
      ? clearSelfReferrer(payload.referrer || "", payload.hostname)
      : payload.referrer || null,
  };

  await db.insert(activeSessions).values(insertData);
}

/**
 * Validates API key for the site
 * @param siteId The site ID from the tracking payload
 * @param apiKey The API key from the payload
 * @returns An object with success status and optional error message
 */
async function validateApiKey(siteId: string, apiKey?: string) {
  if (!apiKey) {
    return { success: false, error: null };
  }

  try {
    await siteConfig.ensureInitialized();
    const numericSiteId =
      typeof siteId === "string" ? parseInt(siteId, 10) : siteId;
    const site = await siteConfig.getSiteConfig(numericSiteId);

    if (!site) {
      return { success: false, error: "Site not found" };
    }

    if (site.apiKey && apiKey === site.apiKey) {
      console.info(`[Tracking] Valid API key for site ${siteId}`);
      return { success: true };
    }

    return { success: false, error: "Invalid API key" };
  } catch (error) {
    console.error("Error validating API key:", error);
    return { success: false, error: "Failed to validate API key" };
  }
}

/**
 * Validates if the request's origin matches the registered domain for the site
 * @param siteId The site ID from the tracking payload
 * @param requestOrigin The origin header from the request
 * @returns An object with success status and optional error message
 */
async function validateOrigin(siteId: string, requestOrigin?: string) {
  try {
    // If origin checking is disabled, return success
    if (DISABLE_ORIGIN_CHECK) {
      console.info(
        `[Tracking] Origin check disabled. Allowing request for site ${siteId} from origin: ${
          requestOrigin || "none"
        }`
      );
      return { success: true };
    }

    // Ensure site config is initialized
    await siteConfig.ensureInitialized();

    // Convert siteId to number
    const numericSiteId =
      typeof siteId === "string" ? parseInt(siteId, 10) : siteId;

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

      // Check if the normalized domains match
      if (normalizedOriginHost !== normalizedSiteDomain) {
        return {
          success: false,
          error: `Origin mismatch. Received: ${requestOrigin}`,
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Invalid origin format: ${requestOrigin}`,
      };
    }
  } catch (error) {
    console.error("Error validating origin:", error);
    return {
      success: false,
      error: "Internal error validating origin",
    };
  }
}

// Unified handler for all events (pageviews and custom events)
export async function trackEvent(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Validate request body using Zod
    const validationResult = trackingPayloadSchema.safeParse(request.body);

    if (!validationResult.success) {
      return reply.status(400).send({
        success: false,
        error: "Invalid payload",
        details: validationResult.error.flatten(),
      });
    }

    // Use validated data
    const validatedPayload = validationResult.data;

    // First check if API key is provided and valid
    const apiKeyValidation = await validateApiKey(
      validatedPayload.site_id,
      validatedPayload.api_key
    );

    // If API key validation failed with an error, reject the request
    if (apiKeyValidation.error) {
      console.warn(
        `[Tracking] Request rejected for site ${validatedPayload.site_id}: ${apiKeyValidation.error}`
      );
      return reply.status(403).send({
        success: false,
        error: apiKeyValidation.error,
      });
    }

    // Check rate limit for API key authenticated requests
    if (apiKeyValidation.success && validatedPayload.api_key) {
      if (!apiKeyRateLimiter.isAllowed(validatedPayload.api_key)) {
        console.warn(
          `[Tracking] Rate limit exceeded for API key ${validatedPayload.api_key} on site ${validatedPayload.site_id}`
        );
        return reply.status(429).send({
          success: false,
          error:
            "Rate limit exceeded. Maximum 20 requests per second per API key.",
        });
      }
    }

    // If no valid API key, validate origin
    if (!apiKeyValidation.success) {
      const originValidation = await validateOrigin(
        validatedPayload.site_id,
        request.headers.origin as string
      );

      if (!originValidation.success) {
        console.warn(
          `[Tracking] Request rejected for site ${validatedPayload.site_id}: ${originValidation.error}`
        );
        return reply.status(403).send({
          success: false,
          error: originValidation.error,
        });
      }
    }

    // Make sure the site config is loaded
    await siteConfig.ensureInitialized();

    // Check if bot blocking is enabled for this site and if the request is from a bot
    // Skip bot check for API key authenticated requests
    if (
      !validatedPayload.api_key &&
      siteConfig.shouldBlockBots(validatedPayload.site_id)
    ) {
      // Use custom user agent if provided, otherwise fall back to header
      const userAgent =
        validatedPayload.user_agent ||
        (request.headers["user-agent"] as string);
      if (userAgent && isbot(userAgent)) {
        console.log(
          `[Tracking] Bot request filtered for site ${validatedPayload.site_id} from User-Agent: ${userAgent}`
        );
        return reply.status(200).send({
          success: true,
          message: "Event not tracked - bot detected",
        });
      }
    }

    // Check if the site has exceeded its monthly limit
    if (isSiteOverLimit(validatedPayload.site_id)) {
      console.log(
        `[Tracking] Skipping event for site ${validatedPayload.site_id} - over monthly limit`
      );
      return reply
        .status(200)
        .send("Site over monthly limit, event not tracked");
    }

    // Create base payload for the event using validated data
    const payload = createBasePayload(
      request, // Pass request for IP/UA
      validatedPayload.type,
      validatedPayload // Add validated payload back
    );

    // Get existing session
    const existingSession = await getExistingSession(
      payload.userId,
      payload.site_id
    );

    if (existingSession) {
      payload.sessionId = existingSession.sessionId;
    }

    // Add to queue for processing
    pageviewQueue.add(payload);
    await updateSession(
      payload,
      existingSession,
      validatedPayload.type === "pageview"
    );

    return reply.status(200).send({
      success: true,
    });
  } catch (error) {
    console.error("Error tracking event:", error);
    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        error: "Invalid payload format",
        details: error.flatten(),
      });
    }
    return reply.status(500).send({
      success: false,
      error: "Failed to track event",
    });
  }
}
