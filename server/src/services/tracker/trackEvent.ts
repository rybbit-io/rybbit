import { FastifyReply, FastifyRequest } from "fastify";
import { isbot } from "isbot";
import { z, ZodError } from "zod";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { siteConfig } from "../../lib/siteConfig.js";
import { sessionsService } from "../sessions/sessionsService.js";
import { usageService } from "../usageService.js";
import { pageviewQueue } from "./pageviewQueue.js";
import { createBasePayload } from "./utils.js";
import { getLocation } from "../../db/geolocation/geolocation.js";

// Shared fields for all event types
const baseEventFields = {
  site_id: z.string().min(1),
  hostname: z.string().max(253).optional(),
  pathname: z.string().max(2048).optional(),
  querystring: z.string().max(2048).optional(),
  screenWidth: z.number().int().positive().optional(),
  screenHeight: z.number().int().positive().optional(),
  language: z.string().max(35).optional(),
  page_title: z.string().max(512).optional(),
  referrer: z.string().max(2048).optional(),
  user_id: z.string().max(255).optional(),
  ip_address: z.string().ip().optional(),
  user_agent: z.string().max(512).optional(),
};

// Default event_name and properties used by pageview and performance
const defaultEventProps = {
  event_name: z.string().max(256).optional(),
  properties: z.string().max(2048).optional(),
};

// Reusable JSON validation refine
const jsonStringRefine = (message: string) =>
  z
    .string()
    .max(2048)
    .refine(
      val => {
        try {
          JSON.parse(val);
          return true;
        } catch {
          return false;
        }
      },
      { message }
    )
    .optional();

// Define Zod schema for validation
export const trackingPayloadSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("pageview"),
      ...baseEventFields,
      ...defaultEventProps,
    })
    .strict(),
  z
    .object({
      type: z.literal("custom_event"),
      ...baseEventFields,
      event_name: z.string().min(1).max(256),
      properties: jsonStringRefine("Properties must be a valid JSON string"),
    })
    .strict(),
  z
    .object({
      type: z.literal("performance"),
      ...baseEventFields,
      ...defaultEventProps,
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
      type: z.literal("outbound"),
      ...baseEventFields,
      event_name: z.string().max(256).optional(),
      properties: z
        .string()
        .max(2048)
        .refine(
          val => {
            try {
              const parsed = JSON.parse(val);
              if (typeof parsed.url !== "string" || parsed.url.length === 0) return false;
              if (parsed.text && typeof parsed.text !== "string") return false;
              if (parsed.target && typeof parsed.target !== "string") return false;
              try {
                new URL(parsed.url);
              } catch {
                return false;
              }
              return true;
            } catch {
              return false;
            }
          },
          {
            message: "Properties must be valid JSON with outbound link fields (url required, text and target optional)",
          }
        ),
    })
    .strict(),
  z
    .object({
      type: z.literal("error"),
      ...baseEventFields,
      event_name: z.string().min(1).max(256), // Error type (TypeError, ReferenceError, etc.)
      properties: z
        .string()
        .max(4096) // Larger limit for error details
        .refine(
          val => {
            try {
              const parsed = JSON.parse(val);
              if (typeof parsed.message !== "string") return false;
              if (parsed.stack && typeof parsed.stack !== "string") return false;
              if (parsed.fileName && typeof parsed.fileName !== "string") return false;
              if (parsed.lineNumber && typeof parsed.lineNumber !== "number") return false;
              if (parsed.columnNumber && typeof parsed.columnNumber !== "number") return false;
              // Apply truncation limits
              if (parsed.message && parsed.message.length > 500) {
                parsed.message = parsed.message.substring(0, 500);
              }
              if (parsed.stack && parsed.stack.length > 2000) {
                parsed.stack = parsed.stack.substring(0, 2000);
              }
              return true;
            } catch {
              return false;
            }
          },
          {
            message:
              "Properties must be valid JSON with error fields (message, stack, fileName, lineNumber, columnNumber)",
          }
        ),
    })
    .strict(),
  z
    .object({
      type: z.literal("button_click"),
      ...baseEventFields,
      event_name: z.string().max(256).optional(),
      properties: jsonStringRefine("Properties must be valid JSON"),
    })
    .strict(),
  z
    .object({
      type: z.literal("copy"),
      ...baseEventFields,
      event_name: z.string().max(256).optional(),
      properties: z
        .string()
        .max(2048)
        .refine(
          val => {
            try {
              const parsed = JSON.parse(val);
              if (typeof parsed.sourceElement !== "string") return false;
              if (parsed.text !== undefined && typeof parsed.text !== "string") return false;
              if (parsed.textLength !== undefined && (typeof parsed.textLength !== "number" || parsed.textLength < 0)) return false;
              return true;
            } catch {
              return false;
            }
          },
          {
            message: "Properties must be valid JSON with copy fields (sourceElement required, text and textLength optional)",
          }
        ),
    })
    .strict(),
  z
    .object({
      type: z.literal("form_submit"),
      ...baseEventFields,
      event_name: z.string().max(256).optional(),
      properties: z
        .string()
        .max(2048)
        .refine(
          val => {
            try {
              const parsed = JSON.parse(val);
              if (typeof parsed.formId !== "string") return false;
              if (typeof parsed.formName !== "string") return false;
              if (typeof parsed.formAction !== "string") return false;
              if (typeof parsed.method !== "string") return false;
              if (typeof parsed.fieldCount !== "number" || parsed.fieldCount < 0) return false;
              return true;
            } catch {
              return false;
            }
          },
          {
            message: "Properties must be valid JSON with form_submit fields (formId, formName, formAction, method, fieldCount required)",
          }
        ),
    })
    .strict(),
  z
    .object({
      type: z.literal("input_change"),
      ...baseEventFields,
      event_name: z.string().max(256).optional(),
      properties: z
        .string()
        .max(2048)
        .refine(
          val => {
            try {
              const parsed = JSON.parse(val);
              if (typeof parsed.element !== "string") return false;
              if (typeof parsed.inputName !== "string") return false;
              return true;
            } catch {
              return false;
            }
          },
          {
            message: "Properties must be valid JSON with input_change fields (element, inputName required)",
          }
        ),
    })
    .strict(),
]);

const logger = createServiceLogger("track-event");

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

    // Get the site configuration to get the numeric siteId
    const siteConfiguration = await siteConfig.getConfig(validatedPayload.site_id);
    if (!siteConfiguration) {
      logger.warn({ siteId: validatedPayload.site_id }, "Site not found");
      return reply.status(404).send({
        success: false,
        error: "Site not found",
      });
    }

    // Check if bot blocking is enabled for this site and if the request is from a bot
    // Skip bot check for Bearer token authenticated requests
    const authHeader = request.headers["authorization"];
    const hasBearerToken = typeof authHeader === "string" && authHeader.startsWith("Bearer ");
    if (!hasBearerToken && siteConfiguration.blockBots) {
      // Use custom user agent if provided, otherwise fall back to header
      const userAgent = validatedPayload.user_agent || (request.headers["user-agent"] as string);
      if (userAgent && isbot(userAgent)) {
        logger.info({ siteId: validatedPayload.site_id, userAgent }, "Bot request filtered");
        return reply.status(200).send({
          success: true,
          message: "Event not tracked - bot detected",
        });
      }
    }

    // Check if the site has exceeded its monthly limit (using numeric siteId)
    if (usageService.isSiteOverLimit(siteConfiguration.siteId)) {
      logger.info({ siteId: validatedPayload.site_id }, "Skipping event - site over monthly limit");
      return reply.status(200).send("Site over monthly limit, event not tracked");
    }

    // Check if the IP should be excluded from tracking
    // Use custom IP if provided in payload, otherwise get from request
    const requestIP = validatedPayload.ip_address || request.ip || "";

    if (siteConfiguration.excludedIPs && siteConfiguration.excludedIPs.length > 0) {
      const isExcluded = await siteConfig.isIPExcluded(requestIP, validatedPayload.site_id);
      if (isExcluded) {
        logger.info({ siteId: validatedPayload.site_id, ip: requestIP }, "IP excluded from tracking");
        return reply.status(200).send({
          success: true,
          message: "Event not tracked - IP excluded",
        });
      }
    }

    // Check if the country should be excluded from tracking
    if (siteConfiguration.excludedCountries && siteConfiguration.excludedCountries.length > 0) {
      const locationResults = await getLocation([requestIP]);
      const locationData = locationResults[requestIP];

      if (locationData?.countryIso) {
        const isCountryExcluded = await siteConfig.isCountryExcluded(locationData.countryIso, validatedPayload.site_id);
        if (isCountryExcluded) {
          logger.info(
            { siteId: validatedPayload.site_id, country: locationData.countryIso },
            "Country excluded from tracking"
          );
          return reply.status(200).send({
            success: true,
            message: "Event not tracked - country excluded",
          });
        }
      }
    }

    // Create base payload for the event using validated data
    const payload = await createBasePayload(
      request, // Pass request for IP/UA
      validatedPayload.type,
      validatedPayload, // Pass original validated payload
      siteConfiguration
    );

    // Update session (use numeric siteId)
    const { sessionId } = await sessionsService.updateSession({
      userId: payload.userId,
      siteId: siteConfiguration.siteId,
    });

    // Add to queue for processing (payload already has numeric siteId)
    await pageviewQueue.add({
      ...payload,
      sessionId,
    });

    return reply.status(200).send({
      success: true,
    });
  } catch (error) {
    logger.error(error, "Error tracking event");
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
