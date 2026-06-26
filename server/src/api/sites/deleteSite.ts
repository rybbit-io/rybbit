import { FastifyReply, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../../db/postgres/postgres.js";
import { sites } from "../../db/postgres/schema.js";
import { siteConfig } from "../../lib/siteConfig.js";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { deleteCustomHostname, isCloudflareConfigured } from "../../lib/cloudflare.js";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { removeProxyDomain } from "../../lib/proxyDomains.js";

const logger = createServiceLogger("managed-proxy");

export async function deleteSite(request: FastifyRequest<{ Params: { siteId: string } }>, reply: FastifyReply) {
  const { siteId: id } = request.params;

  // If this site had a managed proxy, tear down its Cloudflare hostname so we stop being
  // billed. Best-effort: failures are logged and collected by the daily reconcile sweep,
  // and must never block the site deletion itself.
  const [siteRow] = await db
    .select({ proxyDomain: sites.proxyDomain, proxyCfHostnameId: sites.proxyCfHostnameId })
    .from(sites)
    .where(eq(sites.siteId, Number(id)))
    .limit(1);

  if (siteRow?.proxyCfHostnameId && isCloudflareConfigured) {
    try {
      await deleteCustomHostname(siteRow.proxyCfHostnameId);
    } catch (error) {
      logger.error(error as Error, `Failed to delete Cloudflare hostname for deleted site ${id}; reconcile will retry`);
    }
  }
  if (siteRow?.proxyDomain) {
    removeProxyDomain(siteRow.proxyDomain);
  }

  await Promise.all([
    clickhouse.command({
      query: "DELETE FROM session_replay_events WHERE site_id = {id:UInt32}",
      query_params: { id: Number(id) },
    }),
    clickhouse.command({
      query: "DELETE FROM session_replay_metadata WHERE site_id = {id:UInt32}",
      query_params: { id: Number(id) },
    }),
    siteConfig.removeSite(Number(id))
  ]);


  return reply.status(200).send({ success: true });
}
