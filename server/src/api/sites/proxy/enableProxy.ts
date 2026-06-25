import { and, eq, ne } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../../../db/postgres/postgres.js";
import { sites } from "../../../db/postgres/schema.js";
import {
  CloudflareError,
  CustomHostname,
  createCustomHostname,
  findCustomHostnameByName,
  isCloudflareConfigured,
} from "../../../lib/cloudflare.js";
import { createServiceLogger } from "../../../lib/logger/logger.js";
import { addProxyDomain } from "../../../lib/proxyDomains.js";
import {
  buildProxyResponse,
  isValidProxyDomain,
  mapCloudflareStatus,
  normalizeProxyDomain,
} from "./utils.js";

const logger = createServiceLogger("managed-proxy");

const enableProxySchema = z.object({
  domain: z.string().trim().min(3).max(253),
});

export async function enableProxy(
  request: FastifyRequest<{ Params: { siteId: string }; Body: { domain: string } }>,
  reply: FastifyReply
) {
  const siteId = parseInt(request.params.siteId, 10);
  if (isNaN(siteId) || siteId <= 0) {
    return reply.status(400).send({ success: false, error: "Invalid site ID" });
  }

  if (!isCloudflareConfigured) {
    return reply.status(501).send({ success: false, error: "Managed proxy is not configured on this server" });
  }

  const parsed = enableProxySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ success: false, error: "Invalid request", details: parsed.error.flatten() });
  }

  const domain = normalizeProxyDomain(parsed.data.domain);
  if (!isValidProxyDomain(domain)) {
    return reply.status(400).send({
      success: false,
      error: "Invalid domain. Use a subdomain you control, e.g. a.yourdomain.com",
    });
  }

  const site = await db.query.sites.findFirst({ where: eq(sites.siteId, siteId) });
  if (!site) {
    return reply.status(404).send({ success: false, error: "Site not found" });
  }

  // The hostname can back only one site. Reject if another site already claims it.
  const conflicting = await db
    .select({ siteId: sites.siteId })
    .from(sites)
    .where(and(eq(sites.proxyDomain, domain), ne(sites.siteId, siteId)))
    .limit(1);
  if (conflicting.length > 0) {
    return reply.status(409).send({ success: false, error: "That domain is already in use by another site" });
  }

  // Register the custom hostname with Cloudflare. If it already exists (e.g. a leftover
  // from a previous attempt), reuse it rather than failing.
  let customHostname: CustomHostname;
  try {
    customHostname = await createCustomHostname(domain);
  } catch (error) {
    if (error instanceof CloudflareError && (error.code === 1406 || error.code === 1407)) {
      const existing = await findCustomHostnameByName(domain);
      if (!existing) {
        logger.error(error, `Cloudflare reported ${domain} exists but it could not be found`);
        return reply.status(502).send({ success: false, error: "Failed to register domain with Cloudflare" });
      }
      customHostname = existing;
    } else {
      logger.error(error as Error, `Failed to create Cloudflare custom hostname for ${domain}`);
      return reply.status(502).send({ success: false, error: "Failed to register domain with Cloudflare" });
    }
  }

  await db
    .update(sites)
    .set({
      proxyDomain: domain,
      proxyEnabled: true,
      proxyStatus: mapCloudflareStatus(customHostname),
      proxyCfHostnameId: customHostname.id,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(sites.siteId, siteId));

  // Make the domain serve traffic immediately in this process; other processes pick it
  // up on their next refresh.
  addProxyDomain(domain);

  return reply.status(200).send({ success: true, ...buildProxyResponse(domain, siteId, customHostname) });
}
