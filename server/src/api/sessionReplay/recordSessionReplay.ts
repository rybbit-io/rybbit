import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { siteConfig } from "../../lib/siteConfig.js";
import { SessionReplayIngestService } from "../../services/replay/sessionReplayIngestService.js";
import { usageService } from "../../services/usageService.js";
import { RecordSessionReplayRequest } from "../../types/sessionReplay.js";
import { getIpAddress } from "../../utils.js";
import { logger } from "../../lib/logger/logger.js";
import { getLocation } from "../../db/geolocation/geolocation.js";

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
});

function parseReplayPageUrl(pageUrl: string | undefined): { hostname?: string; pathname?: string } {
  if (!pageUrl) {
    return {};
  }

  try {
    const url = new URL(pageUrl);
    return {
      hostname: url.hostname,
      pathname: url.pathname,
    };
  } catch {
    if (pageUrl.startsWith("/")) {
      return {
        pathname: pageUrl.split(/[?#]/, 1)[0],
      };
    }

    return {};
  }
}

export async function recordSessionReplay(
  request: FastifyRequest<{
    Params: { siteId: string };
    Body: RecordSessionReplayRequest;
  }>,
  reply: FastifyReply
) {
  try {
    // Get the site configuration to get the numeric siteId
    const {
      siteId,
      excludedIPs,
      excludedCountries,
      excludedPaths,
      excludedHostnames,
      excludedUserAgents,
      sessionReplay,
    } = (await siteConfig.getConfig(request.params.siteId)) ?? {};

    if (!sessionReplay) {
      logger.info(`[SessionReplay] Skipping event for site ${siteId} - session replay not enabled`);
      return reply.status(200).send({ success: true, message: "Session replay not enabled" });
    }

    if (!siteId) {
      throw new Error(`Site not found: ${request.params.siteId}`);
    }

    // Check if the site has exceeded its monthly limit
    if (usageService.isSiteOverLimit(Number(siteId))) {
      logger.info(`[SessionReplay] Skipping event for site ${siteId} - over monthly limit`);
      return reply.status(200).send("Site over monthly limit, event not tracked");
    }

    // Check if the site can record replays: the plan may not include them (e.g. enabled
    // before a downgrade from Pro) or the monthly replay quota may be exhausted
    if (usageService.isSiteWithoutReplay(Number(siteId))) {
      logger.info(`[SessionReplay] Skipping event for site ${siteId} - replay not available for plan or quota`);
      return reply.status(200).send({ success: true, message: "Session replay not available for plan or quota" });
    }

    const body = recordSessionReplaySchema.parse(request.body) as RecordSessionReplayRequest;

    // Check if the IP should be excluded from tracking
    const requestIP = getIpAddress(request);

    if (excludedIPs && excludedIPs.length > 0 && (await siteConfig.isIPExcluded(requestIP, request.params.siteId))) {
      logger.info(`[SessionReplay] IP ${requestIP} excluded from tracking for site ${siteId}`);
      return reply.status(200).send({
        success: true,
        message: "Session replay not recorded - IP excluded",
      });
    }

    // Check if the country should be excluded from tracking
    if (excludedCountries && excludedCountries.length > 0) {
      const locationResults = await getLocation([requestIP]);
      const locationData = locationResults[requestIP];

      if (locationData?.countryIso) {
        const isCountryExcluded = await siteConfig.isCountryExcluded(locationData.countryIso, request.params.siteId);
        if (isCountryExcluded) {
          logger.info(`[SessionReplay] Country ${locationData.countryIso} excluded from tracking for site ${siteId}`);
          return reply.status(200).send({
            success: true,
            message: "Session replay not recorded - country excluded",
          });
        }
      }
    }

    const { hostname, pathname } = parseReplayPageUrl(body.metadata?.pageUrl);

    // Check if the pathname should be excluded from tracking
    if (excludedPaths && excludedPaths.length > 0) {
      const isPathExcluded = await siteConfig.isPathExcluded(pathname, request.params.siteId);
      if (isPathExcluded) {
        logger.info(`[SessionReplay] Path ${pathname} excluded from tracking for site ${siteId}`);
        return reply.status(200).send({
          success: true,
          message: "Session replay not recorded - path excluded",
        });
      }
    }

    // Check if the hostname should be excluded from tracking
    if (excludedHostnames && excludedHostnames.length > 0) {
      const isHostnameExcluded = await siteConfig.isHostnameExcluded(hostname, request.params.siteId);
      if (isHostnameExcluded) {
        logger.info(`[SessionReplay] Hostname ${hostname} excluded from tracking for site ${siteId}`);
        return reply.status(200).send({
          success: true,
          message: "Session replay not recorded - hostname excluded",
        });
      }
    }

    // Extract request metadata for tracking
    const userAgent = request.headers["user-agent"] || "";

    // Check if the user agent should be excluded from tracking
    if (excludedUserAgents && excludedUserAgents.length > 0) {
      const isUserAgentExcluded = await siteConfig.isUserAgentExcluded(String(userAgent), request.params.siteId);
      if (isUserAgentExcluded) {
        logger.info(`[SessionReplay] User agent excluded from tracking for site ${siteId}`);
        return reply.status(200).send({
          success: true,
          message: "Session replay not recorded - user agent excluded",
        });
      }
    }

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
