import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";

export async function getSiteHasData(request: FastifyRequest<{ Params: { siteId: string } }>, reply: FastifyReply) {
  const { siteId } = request.params;

  try {
    // Check if site has data using original method
    const pageviewsData: { count: number }[] = await clickhouse
      .query({
        query: `SELECT count(*) as count FROM events WHERE site_id = {siteId:Int32}`,
        format: "JSONEachRow",
        query_params: {
          siteId: Number(siteId),
        },
      })
      .then(res => res.json());

    const hasData = pageviewsData[0].count > 0;
    return {
      hasData,
    };
  } catch (error) {
    console.error("Error checking if site has data:", error);
    return reply.status(500).send({ error: "Internal server error" });
  }
}
