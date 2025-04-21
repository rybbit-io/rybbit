import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouseAdmin } from "../../db/clickhouse/clickhouse.js";
import { db } from "../../db/postgres/postgres.js";
import { sites } from "../../db/postgres/schema.js";
import { loadAllowedDomains } from "../../lib/allowedDomains.js";
import { getUserHasAccessToSite } from "../../lib/auth-utils.js";
import { publicSites } from "../../lib/publicSites.js";

export async function deleteSite(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { id } = request.params;

  const userHasAccessToSite = await getUserHasAccessToSite(request, id);
  if (!userHasAccessToSite) {
    return reply.status(403).send({ error: "Forbidden" });
  }

  await db.delete(sites).where(eq(sites.siteId, Number(id)));
  await clickhouseAdmin.command({
    query: `DELETE FROM events WHERE site_id = ${id}`,
  });
  await loadAllowedDomains();

  // Remove the site from the publicSites cache
  publicSites.removeSite(Number(id));

  return reply.status(200).send();
}
