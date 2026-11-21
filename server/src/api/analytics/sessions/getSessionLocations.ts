import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { getTimeStatement } from "../utils/timeWindow.js";
import { buildFilteredSessionsCTE } from "../utils/sessionFilters.js";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";

export interface GetSessionLocationsRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{}>;
}

export const buildSessionLocationsQuery = (query: GetSessionLocationsRequest["Querystring"], siteId: number) => {
  const timeStatement = getTimeStatement(query);
  const filteredSessionsCTE = buildFilteredSessionsCTE(query.filters, siteId, timeStatement);
  const filteredSessionsJoin = filteredSessionsCTE ? "INNER JOIN FilteredSessions USING (session_id)" : "";

  return `
WITH ${filteredSessionsCTE ? `${filteredSessionsCTE},` : ""}
stuff AS (
    SELECT
        session_id,
        argMax(lat, timestamp) AS lat,
        argMax(lon, timestamp) AS lon,
        argMax(city, timestamp) AS city,
        argMax(country, timestamp) AS country
    FROM
        events
    ${filteredSessionsJoin}
    WHERE
        site_id = {site:Int32}
        ${timeStatement}
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
