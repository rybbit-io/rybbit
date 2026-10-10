import type { FastifyReply, FastifyRequest } from "fastify";
import { faviconService, normalizeFaviconDomain } from "../../services/favicon/favicon.js";

export async function getFavicon(request: FastifyRequest<{ Querystring: { domain?: string } }>, reply: FastifyReply) {
  const domain = normalizeFaviconDomain(request.query.domain);
  reply.header("X-Content-Type-Options", "nosniff");
  if (!domain)
    return reply.header("Cache-Control", "no-store").status(400).send({ error: "A valid domain is required" });
  const result = await faviconService.get(domain);
  if (!result.icon) return reply.header("Cache-Control", "no-store").status(404).send({ error: "Favicon not found" });
  // Use the remaining lifetime so browser/CDN caches cannot extend stale bytes
  // for another full hour just before the server's cached entry expires.
  const maxAge = Math.max(0, Math.floor((result.expiresAt - Date.now()) / 1000));
  return reply
    .header("Cache-Control", `public, max-age=${maxAge}, must-revalidate`)
    .header("Content-Security-Policy", "default-src 'none'; sandbox")
    .type(result.icon.contentType)
    .send(result.icon.body);
}
