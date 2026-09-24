import { FastifyReply, FastifyRequest } from "fastify";
import { SiteLifecycleError, siteConfigurationLifecycle } from "../../services/sites/siteConfigurationLifecycle.js";

export async function deleteSite(request: FastifyRequest<{ Params: { siteId: string } }>, reply: FastifyReply) {
  try {
    const siteId = Number(request.params.siteId);
    if (!Number.isInteger(siteId) || siteId <= 0) {
      return reply.status(400).send({ success: false, error: "Invalid site ID" });
    }

    await siteConfigurationLifecycle.delete(siteId);

    return reply.status(200).send({ success: true });
  } catch (error) {
    if (error instanceof SiteLifecycleError) {
      return reply.status(error.statusCode).send({ success: false, error: error.message });
    }

    request.log.error({ err: error }, "Error deleting site");
    return reply.status(500).send({ success: false, error: "Failed to delete site" });
  }
}
