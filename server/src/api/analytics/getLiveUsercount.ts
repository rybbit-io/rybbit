import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { processResults } from "./utils/utils.js";

const paramsSchema = z.object({
  siteId: z.coerce.number().int().positive(),
});

const querySchema = z.object({
  minutes: z.coerce.number().int().positive().default(5),
});

export const getLiveUsercount = async (
  req: FastifyRequest<{
    Params: { siteId: string };
    Querystring: { minutes: number };
  }>,
  res: FastifyReply
) => {
  const paramsValidation = paramsSchema.safeParse(req.params);
  const queryValidation = querySchema.safeParse(req.query);

  if (!paramsValidation.success || !queryValidation.success) {
    return res.status(400).send({
      error: "Invalid request parameters",
      details: paramsValidation.success ? queryValidation.error : paramsValidation.error,
    });
  }

  const { siteId } = paramsValidation.data;
  const { minutes } = queryValidation.data;

  try {
    const query = await clickhouse.query({
      query: `SELECT COUNT(DISTINCT(session_id)) AS count FROM events WHERE timestamp > now() - interval {minutes:Int32} minute AND site_id = {siteId:Int32}`,
      format: "JSONEachRow",
      query_params: {
        siteId,
        minutes,
      },
    });

    const result = await processResults<{ count: number }>(query);

    return res.send({ count: result[0]?.count ?? 0 });
  } catch (error) {
    req.log.error({ err: error, siteId }, "getLiveUsercount: ClickHouse query failed");
    return res.status(500).send({ error: "Failed to fetch live user count" });
  }
};
