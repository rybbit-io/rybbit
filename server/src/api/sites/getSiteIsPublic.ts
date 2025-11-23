import { FastifyRequest, FastifyReply } from "fastify";
import { siteConfig } from "../../lib/siteConfig.js";

export async function getSiteIsPublic(request: FastifyRequest<{ Params: { site: string } }>, reply: FastifyReply) {
  const { site } = request.params;
  const config = await siteConfig.getConfig(site);
  const isPublic = config?.public || false;
  return reply.status(200).send({ isPublic });
}
