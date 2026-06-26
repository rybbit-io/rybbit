import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/postgres/postgres.js";
import { sites } from "../../../db/postgres/schema.js";
import { deleteCustomHostname, isCloudflareConfigured } from "../../../lib/cloudflare.js";
import { createServiceLogger } from "../../../lib/logger/logger.js";
import { removeProxyDomain } from "../../../lib/proxyDomains.js";

const logger = createServiceLogger("managed-proxy");

export async function disableProxy(request: FastifyRequest<{ Params: { siteId: string } }>, reply: FastifyReply) {
  const siteId = parseInt(request.params.siteId, 10);
  if (isNaN(siteId) || siteId <= 0) {
    return reply.status(400).send({ success: false, error: "Invalid site ID" });
  }

  const site = await db.query.sites.findFirst({ where: eq(sites.siteId, siteId) });
  if (!site) {
    return reply.status(404).send({ success: false, error: "Site not found" });
  }

  // Best-effort Cloudflare teardown so we stop being billed. If it fails (CF down),
  // we still clear our state — the daily reconcile sweep deletes the orphan later.
  if (site.proxyCfHostnameId && isCloudflareConfigured) {
    try {
      await deleteCustomHostname(site.proxyCfHostnameId);
    } catch (error) {
      logger.error(error as Error, `Failed to delete Cloudflare hostname for site ${siteId}; reconcile will retry`);
    }
  }

  await db
    .update(sites)
    .set({
      proxyDomain: null,
      proxyEnabled: false,
      proxyStatus: null,
      proxyCfHostnameId: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(sites.siteId, siteId));

  if (site.proxyDomain) {
    removeProxyDomain(site.proxyDomain);
  }

  return reply.status(200).send({ success: true, enabled: false });
}
