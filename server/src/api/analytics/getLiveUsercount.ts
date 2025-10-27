import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { processResults } from "./utils.js";

export const getLiveUsercount = async (
  req: FastifyRequest<{
    Params: { site: string };
    Querystring: { minutes: number };
  }>,
  res: FastifyReply
) => {
  const { site } = req.params;
  const { minutes } = req.query;

  const query = await clickhouse.query({
    query: `SELECT COUNT(DISTINCT(session_id)) AS count FROM events WHERE timestamp > now() - interval {minutes:Int32} minute AND site_id = {siteId:Int32}`,
    format: "JSONEachRow",
    query_params: {
      siteId: Number(site),
      minutes: Number(minutes || 5),
    },
  });

  const result = await processResults<{ count: number }>(query);

  return res.send({ count: result[0].count });
};
