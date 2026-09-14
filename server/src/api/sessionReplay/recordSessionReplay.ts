import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { siteConfig } from "../../lib/siteConfig.js";
import { SessionReplayIngestService } from "../../services/replay/sessionReplayIngestService.js";
import { usageService } from "../../services/usageService.js";
import { RecordSessionReplayRequest } from "../../types/sessionReplay.js";
import { collectCandidateClientIps, resolveClientIp } from "../../services/tracker/resolveClientIp.js";
import { decideSiteExclusion } from "../../services/sites/siteExclusionDecision.js";

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

function parseReplayPageUrl(pageUrl: string | undefined): {
  hostname?: string;
  pathname?: string;
  querystring?: string;
} {
  if (!pageUrl) {
    return {};
  }

  try {
    const url = new URL(pageUrl);
    return {
      hostname: url.hostname,
      pathname: url.pathname,
      querystring: url.search,
    };
  } catch {
    if (pageUrl.startsWith("/")) {
      return {
        pathname: pageUrl.split(/[?#]/, 1)[0],
        querystring: pageUrl.split("#", 1)[0].split(/\?(.*)/s)[1],
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
    const siteConfiguration = await siteConfig.getConfig(request.params.siteId);
    const { siteId, sessionReplay } = siteConfiguration ?? {};

    if (!sessionReplay) {
      request.log.info({ siteId }, "Skipping session replay event because replay is not enabled");
      return reply.status(200).send({ success: true, message: "Session replay not enabled" });
    }

    if (!siteId) {
      throw new Error(`Site not found: ${request.params.siteId}`);
    }

    if (!siteConfiguration) {
      throw new Error(`Site configuration not found: ${request.params.siteId}`);
    }

    // Check if the site has exceeded its monthly limit
    if (usageService.isSiteOverLimit(Number(siteId))) {
      request.log.info({ siteId }, "Skipping session replay event because the Site is over its monthly limit");
      return reply.status(200).send("Site over monthly limit, event not tracked");
    }

    // Check if the site can record replays: the plan may not include them (e.g. enabled
    // before a downgrade from Pro) or the monthly replay quota may be exhausted
    if (usageService.isSiteWithoutReplay(Number(siteId))) {
      request.log.info({ siteId }, "Skipping session replay event because replay is unavailable for plan or quota");
      return reply.status(200).send({ success: true, message: "Session replay not available for plan or quota" });
    }

    const body = recordSessionReplaySchema.parse(request.body) as RecordSessionReplayRequest;

    const requestIP = resolveClientIp(request, { firstPartyProxy: siteConfiguration.firstPartyProxy });
    const { hostname, pathname, querystring } = parseReplayPageUrl(body.metadata?.pageUrl);
    const userAgent = request.headers["user-agent"] || "";

    const exclusionDecision = await decideSiteExclusion(siteConfiguration, {
      ipAddress: requestIP,
      candidateIps: collectCandidateClientIps(request, [requestIP]),
      pathname,
      querystring,
      hostname,
      userAgent: String(userAgent),
    });

    if (exclusionDecision.excluded) {
      request.log.info(
        { siteId, exclusionReason: exclusionDecision.reason },
        "Skipping session replay event because a Site Exclusion Decision matched"
      );
      return reply.status(200).send({
        success: true,
        message: `Session replay not recorded - ${exclusionDecision.label} excluded`,
      });
    }

    const origin = request.headers.origin || "";
    const referrer = request.headers.referer || "";

    const sessionReplayService = new SessionReplayIngestService();
    await sessionReplayService.recordEvents(siteId, body, {
      userAgent,
      ipAddress: requestIP,
      origin,
      referrer,
    });

    return reply.send({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: error.errors });
    }
    request.log.error(error as Error, "Error recording session replay");
    return reply.status(500).send({ error });
  }
}
