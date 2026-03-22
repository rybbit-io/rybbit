import { FastifyReply, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../../db/postgres/postgres.js";
import { sites } from "../../db/postgres/schema.js";
import { siteConfig } from "../../lib/siteConfig.js";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";

export async function deleteSite(request: FastifyRequest<{ Params: { siteId: string } }>, reply: FastifyReply) {
  const { siteId: id } = request.params;

  // await clickhouse.command({
  //   query: "DELETE FROM events WHERE site_id = {id:UInt32}",
  //   query_params: { id: Number(id) },
  // });

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
