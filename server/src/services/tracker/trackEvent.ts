import { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { ingestEvent } from "./ingestEvent.js";
import { trackingPayloadSchema } from "./trackingPayload.js";
import { resolveTrackingRequest } from "./trackingRequest.js";

const logger = createServiceLogger("track-event");

/**
 * HTTP entry point for all event types.
 *
 * Parse, resolve, ingest, answer — nothing else lives here. The ingestion rules
 * are in `ingestEvent`, and everything the request means is resolved once by
 * `resolveTrackingRequest`.
 */
export async function trackEvent(request: FastifyRequest, reply: FastifyReply) {
  try {
    const validationResult = trackingPayloadSchema.safeParse(request.body);

    if (!validationResult.success) {
      return reply.status(400).send({
        success: false,
        error: "Invalid payload",
        details: validationResult.error.flatten(),
      });
    }

    const trackingRequest = await resolveTrackingRequest(request, validationResult.data);

    if (!trackingRequest) {
      logger.warn({ siteId: validationResult.data.site_id }, "Site not found");
      return reply.status(404).send({
        success: false,
        error: "Site not found",
      });
    }

    const outcome = await ingestEvent(trackingRequest);

    if (outcome.status === "over_limit") {
      return reply.status(200).send("Site over monthly limit, event not tracked");
    }

    if (outcome.status === "excluded") {
      return reply.status(200).send({
        success: true,
        message: `Event not tracked - ${outcome.exclusion.label} excluded`,
      });
    }

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
