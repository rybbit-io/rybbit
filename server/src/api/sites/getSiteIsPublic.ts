import { FastifyRequest, FastifyReply } from "fastify";
import { siteConfig } from "../../lib/siteConfig.js";

export async function getSiteIsPublic(request: FastifyRequest<{ Params: { siteId: string } }>, reply: FastifyReply) {
  const { siteId } = request.params;
  const config = await siteConfig.getConfig(siteId);
  const isPublic = config?.public || false;
  return reply.status(200).send({ isPublic });
}
