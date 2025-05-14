import { FastifyReply, FastifyRequest } from "fastify";
import clickhouse from "../../db/clickhouse/clickhouse.js";
import {
  getTimeStatement,
  processResults,
  getFilterStatement,
} from "./utils.js";
import { getUserHasAccessToSitePublic } from "../../lib/auth-utils.js";

export type GetEventNamesResponse = {
  eventName: string;
  count: number;
}[];

export interface GetEventNamesRequest {
  Params: {
    site: string;
  };
  Querystring: {
    startDate?: string;
    endDate?: string;
    timezone: string;
    filters?: string;
    minutes?: string;
  };
}

export async function getEventNames(
  req: FastifyRequest<GetEventNamesRequest>,
  res: FastifyReply
) {
  const { startDate, endDate, timezone, filters, minutes } = req.query;
  const site = req.params.site;
  const userHasAccessToSite = await getUserHasAccessToSitePublic(req, site);
  if (!userHasAccessToSite) {
    return res.status(403).send({ error: "Forbidden" });
  }

  const timeStatement = getTimeStatement(
    minutes
      ? { pastMinutes: Number(minutes) }
      : { date: { startDate, endDate, timezone } }
  );

  const filterStatement = filters ? getFilterStatement(filters) : "";

  const query = `
    SELECT
      event_name AS eventName,
      count() AS count
    FROM events
    WHERE
      site_id = {siteId:Int32}
      AND type = 'custom_event'
      AND event_name IS NOT NULL
      AND event_name != ''
      ${timeStatement}
      ${filterStatement}
    GROUP BY event_name
    ORDER BY count DESC
    LIMIT 1000
  `;

  try {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteId: Number(site),
      },
    });

    const data = await processResults<GetEventNamesResponse[number]>(result);
    return res.send({ data });
  } catch (error) {
    console.error("Generated Query:", query);
    console.error("Error fetching event names:", error);
    return res.status(500).send({ error: "Failed to fetch event names" });
  }
}
