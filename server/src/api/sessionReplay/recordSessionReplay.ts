import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { siteConfig } from "../../lib/siteConfig.js";
import { SessionReplayIngestService } from "../../services/replay/sessionReplayIngestService.js";
import { validateApiKey } from "../../services/shared/requestValidation.js";
import { usageService } from "../../services/usageService.js";
import { RecordSessionReplayRequest } from "../../types/sessionReplay.js";
import { getIpAddress } from "../../utils.js";
import { logger } from "../../lib/logger/logger.js";

const recordSessionReplaySchema = z.object({
  userId: z.string(),
  events: z.array(
    z.object({
      type: z.union([z.string(), z.number()]),
      data: z.any(),
      timestamp: z.number(),
    })
  ),
  metadata: z
    .object({
      pageUrl: z.string(),
      viewportWidth: z.number().optional(),
      viewportHeight: z.number().optional(),
      language: z.string().optional(),
    })
    .optional(),
  apiKey: z.string().max(35).optional(), // rb_ prefix + 32 hex chars
});

export async function recordSessionReplay(
  request: FastifyRequest<{
    Params: { site: string };
    Body: RecordSessionReplayRequest;
  }>,
  reply: FastifyReply
) {
  try {
    // Get the site configuration to get the numeric siteId
    const { siteId, excludedIPs, excludedCountries, sessionReplay } = (await siteConfig.getConfig(request.params.site)) ?? {};

    if (!sessionReplay) {
      logger.info(`[SessionReplay] Skipping event for site ${siteId} - session replay not enabled`);
      return reply.status(200).send({ success: true, message: "Session replay not enabled" });
    }

    if (!siteId) {
      throw new Error(`Site not found: ${request.params.site}`);
    }

    // Check if the site has exceeded its monthly limit
    if (usageService.isSiteOverLimit(Number(siteId))) {
      logger.info(`[SessionReplay] Skipping event for site ${siteId} - over monthly limit`);
      return reply.status(200).send("Site over monthly limit, event not tracked");
    }

    const body = recordSessionReplaySchema.parse(request.body) as RecordSessionReplayRequest;

    // First check if API key is provided and valid
    const apiKeyValidation = await validateApiKey(siteId, body.apiKey);

    // If API key validation failed with an error, reject the request
    if (apiKeyValidation.error) {
      logger.warn(`[SessionReplay] Request rejected for site ${siteId}: ${apiKeyValidation.error}`);
      return reply.status(403).send({
        success: false,
        error: apiKeyValidation.error,
      });
    }

    // Check rate limit for API key authenticated requests
    // ratelimit for session replays doesn't really work right now

    // if (apiKeyValidation.success && body.apiKey) {
    //   if (!checkApiKeyRateLimit(body.apiKey)) {
    //     console.warn(
    //       `[SessionReplay] Rate limit exceeded for API key ${body.apiKey} on site ${siteId}`,
    //     );
    //     return reply.status(429).send({
    //       success: false,
    //       error: "Rate limit exceeded. Maximum 20 requests per second per API key.",
    //     });
    //   }
    // }

    // Check if the IP should be excluded from tracking
    const requestIP = getIpAddress(request);

    if (excludedIPs && excludedIPs.includes(requestIP)) {
      logger.info(`[SessionReplay] IP ${requestIP} excluded from tracking for site ${siteId}`);
      return reply.status(200).send({
        success: true,
        message: "Session replay not recorded - IP excluded",
      });
    }

    // Check if the country should be excluded from tracking
    if (excludedCountries && excludedCountries.length > 0) {
      const { getLocation } = await import("../../db/geolocation/geolocation.js");
      const locationResults = await getLocation([requestIP]);
      const locationData = locationResults[requestIP];

      if (locationData?.countryIso) {
        const isCountryExcluded = await siteConfig.isCountryExcluded(locationData.countryIso, request.params.site);
        if (isCountryExcluded) {
          logger.info(`[SessionReplay] Country ${locationData.countryIso} excluded from tracking for site ${siteId}`);
          return reply.status(200).send({
            success: true,
            message: "Session replay not recorded - country excluded",
          });
        }
      }
    }

    // Extract request metadata for tracking
    const userAgent = request.headers["user-agent"] || "";
    const ipAddress = getIpAddress(request);
    const origin = request.headers.origin || "";
    const referrer = request.headers.referer || "";

    const sessionReplayService = new SessionReplayIngestService();
    await sessionReplayService.recordEvents(siteId, body, {
      userAgent,
      ipAddress,
      origin,
      referrer,
    });

    return reply.send({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: error.errors });
    }
    logger.error(error as Error, "Error recording session replay");
    return reply.status(500).send({ error });
  }
}
