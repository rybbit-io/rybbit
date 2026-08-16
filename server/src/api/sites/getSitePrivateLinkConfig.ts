import { FastifyRequest, FastifyReply } from "fastify";
import { siteConfig } from "../../lib/siteConfig.js";

export async function getSitePrivateLinkConfig(
  request: FastifyRequest<{ Params: { siteId: string } }>,
  reply: FastifyReply
) {
  try {
    const parsedSiteId = parseInt(request.params.siteId, 10);

    if (isNaN(parsedSiteId)) {
      return reply.status(400).send({ success: false, error: "Invalid site ID" });
    }

    // Generating or revoking the key writes through the Site Configuration
    // module, and this screen reads that write back straight away.
    const config = await siteConfig.reload(parsedSiteId);

    if (!config) {
      return reply.status(404).send({ success: false, error: "Site not found" });
    }

    return reply.send({
      success: true,
      data: {
        privateLinkKey: config.privateLinkKey,
      },
    });
  } catch (error) {
    request.log.error({ err: error }, "Error getting site private link configuration");
    return reply.status(500).send({
      success: false,
      error: "Failed to get site private link configuration",
    });
  }
}
