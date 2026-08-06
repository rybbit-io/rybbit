import { FastifyReply, FastifyRequest } from "fastify";
import { getTimeStatement } from "../utils/utils.js";
import { FilterParams } from "@rybbit/shared";
import { getFilterStatement } from "../utils/getFilterStatement.js";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";

export type GetEventNamesResponse = {
  eventName: string;
  count: number;
}[];

export interface GetEventNamesRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    event_name: string;
  }>;
}

export const buildEventNamesQuery = (query: GetEventNamesRequest["Querystring"], siteId: number) => {
  const { filters } = query;

  const timeStatement = getTimeStatement(query);

  const filterStatement = filters ? getFilterStatement(filters, siteId, timeStatement) : "";

  return `
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
};

export const getEventNames = analyticsRoute<GetEventNamesRequest>(
  "event names",
  async (req: FastifyRequest<GetEventNamesRequest>, res: FastifyReply) => {
    const site = req.params.siteId;

    const data = await runAnalyticsQuery<GetEventNamesResponse[number]>({
      query: buildEventNamesQuery(req.query, Number(site)),
      params: { siteId: Number(site) },
    });

    return res.send({ data });
  }
);
