import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getFilterStatement, getTimeStatement, processResults } from "./utils.js";

export async function getSessionLocations(
  req: FastifyRequest<{
    Params: {
      site: string;
    };
    Querystring: FilterParams<{}>;
  }>,
  res: FastifyReply
) {
  const { site } = req.params;

  const filterStatement = getFilterStatement(req.query.filters);
  const timeStatement = getTimeStatement(req.query);

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
        ${timeStatement}
        ${filterStatement}
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
