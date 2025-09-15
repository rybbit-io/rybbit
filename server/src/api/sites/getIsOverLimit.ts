import { FastifyReply, FastifyRequest } from "fastify";
import { siteConfig } from "../../lib/siteConfig.js";
import { usageService } from "../../services/usageService.js";

interface GetIsOverLimitParams {
  Params: {
    site: string;
  };
}

export async function getIsOverLimit(request: FastifyRequest<GetIsOverLimitParams>, reply: FastifyReply) {
  const { site } = request.params;

  try {
    // Get the site configuration to get the numeric siteId
    const siteConfiguration = await siteConfig.getSiteConfig(site);
    if (!siteConfiguration) {
      return reply.status(404).send({ error: "Site not found" });
    }

    // Check if the site has exceeded its monthly limit
    const isOverLimit = usageService.isSiteOverLimit(siteConfiguration.siteId);

    return reply.status(200).send({
      siteId: site,
      isOverLimit: isOverLimit,
    });
  } catch (error) {
    console.error("Error checking site limit:", error);
    return reply.status(500).send({ error: "Internal server error" });
  }
}