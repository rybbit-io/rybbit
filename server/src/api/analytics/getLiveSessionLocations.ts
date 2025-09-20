import { FastifyRequest, FastifyReply } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { processResults } from "./utils.js";
import SqlString from "sqlstring";

export async function getLiveSessionLocations(
  req: FastifyRequest<{
    Params: {
      site: string;
    };
    Querystring: {
      time: number;
    };
  }>,
  res: FastifyReply
) {
  const { site } = req.params;
  if (isNaN(Number(req.query.time))) {
    return res.status(400).send({ error: "Invalid time" });
  }

  const result = await clickhouse.query({
    query: `
WITH stuff AS (
    SELECT
        session_id,
        any(lat) AS lat,
        any(lon) AS lon,
        any(city) AS city
    FROM
        events
    WHERE
        site_id = {site:Int32}
        AND timestamp > now() - interval ${SqlString.escape(Number(req.query.time))} minute
    GROUP BY
        session_id
)
SELECT
    lat,
    lon,
    city,
    count() as count
from
    stuff
GROUP BY
    lat,
    lon,
    city`,
    query_params: {
      site,
    },
    format: "JSONEachRow",
  });

  const data = await processResults<{
    lat: number;
    lon: number;
    count: number;
    city: string;
  }>(result);

  return res.status(200).send({ data });
}
