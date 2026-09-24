import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";

export async function getSiteHasData(request: FastifyRequest<{ Params: { siteId: string } }>, reply: FastifyReply) {
  const { siteId } = request.params;

  try {
    // `count(*)` reads every row for the site just to answer "any?" — 134.8 B
    // rows across the poll's 289 k calls in one six-day window. LIMIT 1 alone
    // is close to a wash, because parallel readers each fetch a granule before
    // the limit stops them; pinning to a single thread is what turns this into
    // a two-granule read.
    const rows: { has_data: number }[] = await clickhouse
      .query({
        query: `SELECT 1 AS has_data FROM events WHERE site_id = {siteId:Int32} LIMIT 1`,
        format: "JSONEachRow",
        query_params: {
          siteId: Number(siteId),
        },
        clickhouse_settings: {
          max_threads: 1,
        },
      })
      .then(res => res.json());

    return {
      hasData: rows.length > 0,
    };
  } catch (error) {
    request.log.error({ err: error }, "Error checking if site has data");
    return reply.status(500).send({ error: "Internal server error" });
  }
}
