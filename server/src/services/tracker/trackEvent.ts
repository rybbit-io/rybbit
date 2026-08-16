import { ALL_CLIENT_BOT_SIGNAL_BITS, MAX_CLIENT_BOT_SCORE } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { z, ZodError } from "zod";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { siteConfig } from "../../lib/siteConfig.js";
import { sessionsService } from "../sessions/sessionsService.js";
import { usageService } from "../usageService.js";
import { pageviewQueue } from "./pageviewQueue.js";
import { createBasePayload } from "./utils.js";
import { checkApiKey } from "../../lib/auth-utils.js";
import { hasScope } from "../../lib/scopes.js";
import { botEventQueue } from "./botBlocking/botEventQueue.js";
import { checkBotBlocking } from "./botBlocking/index.js";
import { resolveTrackingIdentity } from "./requestIdentity.js";
import { decideSiteExclusion } from "../sites/siteExclusionDecision.js";

// Shared fields for all event types
const baseEventFields = {
  site_id: z.string().min(1),
  hostname: z.string().max(253).optional(),
  pathname: z.string().max(2048).optional(),
  querystring: z.string().max(2048).optional(),
  screenWidth: z.number().int().nonnegative().optional(),
  screenHeight: z.number().int().nonnegative().optional(),
  language: z.string().max(35).optional(),
  page_title: z.string().max(512).optional(),
  referrer: z.string().max(2048).optional(),
  anonymous_id: z.string().min(1).max(255).optional(),
  user_id: z.string().max(255).optional(),
  tag: z.string().max(256).optional(),
  feature_flags: z.record(z.string().max(100), z.string().max(2048)).optional(),
  ip_address: z.string().ip().optional(),
  user_agent: z.string().max(512).optional(),
  // Bounds come from the Bot Signal contract, so appending a signal bit widens
  // the accepted mask with it. Hard-coding the bound is how the 12th bit
  // (squareScreen = 2048) came to fail validation and drop the whole event.
  _bs: z.number().int().min(0).max(MAX_CLIENT_BOT_SCORE).optional(),
  _bsm: z.number().int().min(0).max(ALL_CLIENT_BOT_SIGNAL_BITS).optional(),
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
              if (parsed.textLength !== undefined && (typeof parsed.textLength !== "number" || parsed.textLength < 0))
                return false;
              return true;
            } catch {
              return false;
            }
          },
          {
            message:
              "Properties must be valid JSON with copy fields (sourceElement required, text and textLength optional)",
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
            message:
              "Properties must be valid JSON with form_submit fields (formId, formName, formAction, method, fieldCount required)",
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

async function isTrustedServerSideIngestion(request: FastifyRequest, siteId: number): Promise<boolean> {
  const authHeader = request.headers["authorization"];
  if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  // An under-scoped bearer degrades to untrusted client-side traffic (no 4xx)
  // — this is a public ingestion endpoint, not an authenticated API.
  const apiKeyResult = await checkApiKey(request, { siteId });
  return apiKeyResult.valid && hasScope(apiKeyResult.statements, { resource: "ingest", action: "write" });
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

    // Get the site configuration to get the numeric siteId
    const siteConfiguration = await siteConfig.getConfig(validatedPayload.site_id);
    if (!siteConfiguration) {
      logger.warn({ siteId: validatedPayload.site_id }, "Site not found");
      return reply.status(404).send({
        success: false,
        error: "Site not found",
      });
    }

    const trustedServerSideIngestion = await isTrustedServerSideIngestion(request, siteConfiguration.siteId);
    const trackingIdentity = resolveTrackingIdentity(
      request,
      validatedPayload,
      trustedServerSideIngestion,
      siteConfiguration.firstPartyProxy
    );
    const requestIP = trackingIdentity.ipAddress;

    const botDetectionResult = await checkBotBlocking({
      request,
      blockBots: siteConfiguration.blockBots,
      trustedServerSideIngestion,
      isMobileSite: siteConfiguration.type === "mobile",
      payload: {
        siteId: siteConfiguration.siteId,
        userAgent: trackingIdentity.userAgent,
        clientBotScore: validatedPayload._bs,
        clientBotSignalMask: validatedPayload._bsm,
        screenWidth: validatedPayload.screenWidth,
        screenHeight: validatedPayload.screenHeight,
        language: validatedPayload.language,
        hostname: validatedPayload.hostname,
        pathname: validatedPayload.pathname,
        eventType: validatedPayload.type,
        ipAddress: requestIP,
      },
    });

    // Check if the site has exceeded its monthly limit (using numeric siteId)
    if (usageService.isSiteOverLimit(siteConfiguration.siteId)) {
      logger.info({ siteId: validatedPayload.site_id }, "Skipping event - site over monthly limit");
      return reply.status(200).send("Site over monthly limit, event not tracked");
    }

    const exclusionDecision = await decideSiteExclusion(siteConfiguration, {
      ipAddress: requestIP,
      candidateIps: trackingIdentity.candidateIps,
      pathname: validatedPayload.pathname,
      querystring: validatedPayload.querystring,
      hostname: validatedPayload.hostname,
      userAgent: trackingIdentity.userAgent,
    });

    if (exclusionDecision.excluded) {
      logger.info(
        { siteId: validatedPayload.site_id, exclusionReason: exclusionDecision.reason },
        "Site exclusion matched"
      );
      return reply.status(200).send({
        success: true,
        message: `Event not tracked - ${exclusionDecision.label} excluded`,
      });
    }

    // Create base payload for the event using validated data
    const payload = await createBasePayload(
      request, // Pass request for IP/UA
      validatedPayload.type,
      validatedPayload, // Pass original validated payload
      siteConfiguration,
      trustedServerSideIngestion
    );

    if (botDetectionResult) {
      await botEventQueue.add({
        ...payload,
        ...botDetectionResult.eventProperties,
        sessionId: `bot:${payload.userId}`,
      });

      return reply.status(200).send({
        success: true,
      });
    }

    // Update session (use numeric siteId)
    const { sessionId } = await sessionsService.updateSession({
      userId: payload.userId,
      identifiedUserId: payload.identifiedUserId,
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
    logger.error({ err: error }, "Error tracking event");
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
