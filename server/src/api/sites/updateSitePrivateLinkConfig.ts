import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { SiteLifecycleError, siteConfigurationLifecycle } from "../../services/sites/siteConfigurationLifecycle.js";

const updatePrivateLinkConfigSchema = z.object({
  action: z.enum(["generate_private_link_key", "revoke_private_link_key"]),
});

export async function updateSitePrivateLinkConfig(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { siteId } = request.params as { siteId: string };
    const parsedSiteId = Number(siteId);

    if (!Number.isInteger(parsedSiteId) || parsedSiteId <= 0) {
      return reply.status(400).send({ success: false, error: "Invalid site ID" });
    }

    const validationResult = updatePrivateLinkConfigSchema.safeParse(request.body);
    if (!validationResult.success) {
      return reply.status(400).send({
        success: false,
        error: "Invalid request body",
        details: validationResult.error.flatten(),
      });
    }

    const privateLinkKey = await siteConfigurationLifecycle.updatePrivateLink(
      parsedSiteId,
      validationResult.data.action
    );

    return reply.send({
      success: true,
      data: { privateLinkKey },
    });
  } catch (error) {
    if (error instanceof SiteLifecycleError) {
      return reply.status(error.statusCode).send({ success: false, error: error.message });
    }

    request.log.error({ err: error }, "Error updating site private link config");
    return reply.status(500).send({
      success: false,
      error: "Failed to update site API configuration",
    });
  }
}
