import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getUserHasAdminAccessToSite } from "../../lib/auth-utils.js";
import { siteConfig } from "../../lib/siteConfig.js";

export async function deleteSite(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const { id } = request.params;

  const userHasAdminAccessToSite = await getUserHasAdminAccessToSite(request, id);
  if (!userHasAdminAccessToSite) {
    return reply.status(403).send({ error: "Forbidden" });
  }

  await clickhouse.command({
    query: `DELETE FROM events WHERE site_id = ${id}`,
  });

  siteConfig.removeSite(Number(id));

  return reply.status(200).send({ success: true });
}
