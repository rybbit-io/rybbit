import { FastifyReply, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { db } from "../../db/postgres/postgres.js";
import { sites } from "../../db/postgres/schema.js";
import { getUserHasAdminAccessToSite } from "../../lib/auth-utils.js";
import { siteConfig } from "../../lib/siteConfig.js";

export async function deleteSite(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const { id } = request.params;

  const userHasAdminAccessToSite = await getUserHasAdminAccessToSite(request, id);
  if (!userHasAdminAccessToSite) {
    return reply.status(403).send({ error: "Forbidden" });
  }

  // await clickhouse.command({
  //   query: "DELETE FROM events WHERE site_id = {id:UInt32}",
  //   query_params: { id: Number(id) },
  // });

  // Delete the site from the sites table (related records will cascade delete automatically)
  await db.delete(sites).where(eq(sites.siteId, Number(id)));

  siteConfig.removeSite(Number(id));

  return reply.status(200).send({ success: true });
}
