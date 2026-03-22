import { FastifyReply, FastifyRequest } from "fastify";
import { siteConfig } from "../../lib/siteConfig.js";

export async function getTrackingConfig(request: FastifyRequest<{ Params: { siteId: string } }>, reply: FastifyReply) {
  try {
    const config = await siteConfig.getConfig(request.params.siteId);

    // Return 404 if site doesn't exist
    if (!config) {
      return reply.status(404).send({ error: "Site not found" });
    }

    // Return tracking configuration
    // This endpoint is public since the analytics script needs to fetch it
    return reply.send({
      sessionReplay: config.sessionReplay || false,
      webVitals: config.webVitals || false,
      trackErrors: config.trackErrors || false,
      trackOutbound: config.trackOutbound ?? true,
      trackUrlParams: config.trackUrlParams ?? true,
      trackInitialPageView: config.trackInitialPageView ?? true,
      trackSpaNavigation: config.trackSpaNavigation ?? true,
      trackButtonClicks: config.trackButtonClicks || false,
      trackCopy: config.trackCopy || false,
      trackFormInteractions: config.trackFormInteractions || false,
    });
  } catch (error) {
    console.error("Error getting tracking config:", error);
    return reply.status(500).send({ error: "Failed to get tracking configuration" });
  }
}
