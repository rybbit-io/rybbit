import { FastifyReply, FastifyRequest } from "fastify";
import { siteConfig } from "../../lib/siteConfig.js";
import { hasFeatureFlagsForRuntime } from "../../services/featureFlags/definitions.js";
import { usageService } from "../../services/usageService.js";

export async function getTrackingConfig(request: FastifyRequest<{ Params: { siteId: string } }>, reply: FastifyReply) {
  try {
    const config = await siteConfig.getConfig(request.params.siteId);

    // Return 404 if site doesn't exist
    if (!config) {
      return reply.status(404).send({ error: "Site not found" });
    }

    // Report replay as off when the plan doesn't include it so the tracking script
    // never loads the recorder (replay payloads would be dropped at ingest anyway)
    const sessionReplay =
      config.type === "mobile" ? false : config.sessionReplay && !usageService.isSiteWithoutReplay(config.siteId);
    const featureFlagsEnabled = await hasFeatureFlagsForRuntime(config.siteId, "client");

    // Return tracking configuration
    // This endpoint is public since the analytics script needs to fetch it
    // Every field below the plan/type overrides arrives already defaulted from
    // the Site Configuration module — re-applying `?? true` / `|| false` here
    // would only hide it if that ever stopped being true.
    return reply.send({
      type: config.type,
      featureFlagsEnabled,
      sessionReplay,
      webVitals: config.type === "mobile" ? false : config.webVitals,
      trackErrors: config.trackErrors,
      trackOutbound: config.trackOutbound,
      trackUrlParams: config.trackUrlParams,
      trackInitialPageView: config.trackInitialPageView,
      trackSpaNavigation: config.trackSpaNavigation,
      trackButtonClicks: config.trackButtonClicks,
      trackCopy: config.trackCopy,
      trackFormInteractions: config.trackFormInteractions,
    });
  } catch (error) {
    request.log.error({ err: error }, "Error getting tracking config");
    return reply.status(500).send({ error: "Failed to get tracking configuration" });
  }
}
