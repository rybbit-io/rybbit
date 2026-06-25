import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/postgres/postgres.js";
import { sites } from "../../../db/postgres/schema.js";
import {
  CLOUDFLARE_SAAS_CNAME_TARGET,
  CloudflareError,
  getCustomHostname,
  isCloudflareConfigured,
} from "../../../lib/cloudflare.js";
import { createServiceLogger } from "../../../lib/logger/logger.js";
import { buildProxyResponse, mapCloudflareStatus } from "./utils.js";

const logger = createServiceLogger("managed-proxy");

export async function getProxyStatus(request: FastifyRequest<{ Params: { siteId: string } }>, reply: FastifyReply) {
  const siteId = parseInt(request.params.siteId, 10);
  if (isNaN(siteId) || siteId <= 0) {
    return reply.status(400).send({ success: false, error: "Invalid site ID" });
  }

  const site = await db.query.sites.findFirst({ where: eq(sites.siteId, siteId) });
  if (!site) {
    return reply.status(404).send({ success: false, error: "Site not found" });
  }

  if (!site.proxyEnabled || !site.proxyDomain || !site.proxyCfHostnameId) {
    return reply.status(200).send({
      success: true,
      configured: isCloudflareConfigured,
      enabled: false,
      domain: site.proxyDomain ?? null,
      cnameTarget: CLOUDFLARE_SAAS_CNAME_TARGET,
    });
  }

  // Without Cloudflare configured we can only report the last persisted status.
  if (!isCloudflareConfigured) {
    return reply.status(200).send({
      success: true,
      configured: false,
      enabled: true,
      domain: site.proxyDomain,
      status: site.proxyStatus ?? "pending",
      active: site.proxyStatus === "active",
    });
  }

  try {
    const customHostname = await getCustomHostname(site.proxyCfHostnameId);
    const status = mapCloudflareStatus(customHostname);

    // Persist status transitions so the value stays meaningful even between polls.
    if (status !== site.proxyStatus) {
      await db.update(sites).set({ proxyStatus: status }).where(eq(sites.siteId, siteId));
    }

    return reply
      .status(200)
      .send({ success: true, configured: true, ...buildProxyResponse(site.proxyDomain, siteId, customHostname) });
  } catch (error) {
    // The hostname was deleted out from under us (e.g. by the reconcile sweep or
    // directly in Cloudflare). Report it as failed rather than 500ing.
    if (error instanceof CloudflareError && error.status === 404) {
      await db.update(sites).set({ proxyStatus: "failed" }).where(eq(sites.siteId, siteId));
      return reply.status(200).send({
        success: true,
        configured: true,
        enabled: true,
        domain: site.proxyDomain,
        status: "failed",
        active: false,
        error: "Custom hostname not found in Cloudflare",
      });
    }
    logger.error(error as Error, `Failed to fetch Cloudflare status for site ${siteId}`);
    return reply.status(502).send({ success: false, error: "Failed to fetch proxy status" });
  }
}
