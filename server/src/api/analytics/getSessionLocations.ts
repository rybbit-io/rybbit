import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getTimeStatement, processResults } from "./utils/utils.js";
import { getFilterStatement } from "./utils/getFilterStatement.js";

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

  const timeStatement = getTimeStatement(req.query);
  const filterStatement = getFilterStatement(req.query.filters, Number(site), timeStatement);

  const result = await clickhouse.query({
    query: `
WITH stuff AS (
    SELECT
        session_id,
        any(lat) AS lat,
        any(lon) AS lon,
        any(city) AS city,
        any(country) AS country
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
    country,
    count() as count
from
    stuff
GROUP BY
    lat,
    lon,
    city,
    country`,
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
