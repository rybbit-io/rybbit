import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { getTimeStatement } from "../utils/utils.js";
import { getFilterStatement } from "../utils/getFilterStatement.js";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";

export interface GetSessionLocationsRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{}>;
}

export const buildSessionLocationsQuery = (query: GetSessionLocationsRequest["Querystring"], siteId: number) => {
  const timeStatement = getTimeStatement(query);
  const filterStatement = getFilterStatement(query.filters, siteId, timeStatement);

  return `
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
    country`;
};

export const getSessionLocations = analyticsRoute<GetSessionLocationsRequest>(
  "session locations",
  async (req: FastifyRequest<GetSessionLocationsRequest>, res: FastifyReply) => {
    const { siteId } = req.params;

    const data = await runAnalyticsQuery<{
      lat: number;
      lon: number;
      count: number;
      city: string;
    }>({
      query: buildSessionLocationsQuery(req.query, Number(siteId)),
      params: {
        site: siteId,
      },
    });

    return res.status(200).send({ data });
  }
);
