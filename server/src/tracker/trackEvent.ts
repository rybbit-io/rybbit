import { FastifyReply, FastifyRequest } from "fastify";
import { z, ZodError } from "zod";
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
import { getDeviceType } from "../utils.js";
import { pageviewQueue } from "./pageviewQueue.js";
import { siteConfig } from "../lib/siteConfig.js";
import { DISABLE_ORIGIN_CHECK } from "./const.js";

// Define Zod schema for validation
export const trackingPayloadSchema = z.discriminatedUnion("type", [
  z.object({
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
  }),
  z.object({
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
  }),
]);

// Update session for both pageviews and events
export async function updateSession(
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

// Process tracking event and add to queue
export async function processTrackingEvent(
  payload: TotalTrackingPayload,
  existingSession: any | null,
  isPageview: boolean = true
): Promise<void> {
  // If session exists, use its ID instead of generated one
  if (existingSession) {
    payload.sessionId = existingSession.sessionId;
  }

  // Add to queue for processing
  await pageviewQueue.add(payload);

  // Update session data
  await updateSession(payload, existingSession, isPageview);
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

    // Get the domain associated with this site
    const siteDomain = siteConfig.getSiteDomain(numericSiteId);

    if (!siteDomain) {
      return {
        success: false,
        error: "Site not found or has no registered domain",
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
      // Parse the origin into URL components
      const originUrl = new URL(requestOrigin);

      // Normalize domains by removing 'www.' prefix if present
      const normalizedOriginHost = originUrl.hostname.replace(/^www\./, "");
      const normalizedSiteDomain = siteDomain.replace(/^www\./, "");

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

    // Validate that the request is coming from the expected origin
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

    // Process the event
    await processTrackingEvent(
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
