import { FastifyReply, FastifyRequest } from "fastify";
import { getTimeStatement } from "../utils/utils.js";
import { FilterParams } from "@rybbit/shared";
import { getFilterStatement } from "../utils/getFilterStatement.js";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";

export type GetEventPropertiesResponse = {
  propertyKey: string;
  propertyValue: string;
  count: number;
}[];

export interface GetEventPropertiesRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    event_name: string;
  }>;
}

export const buildEventPropertiesQuery = (query: GetEventPropertiesRequest["Querystring"], siteId: number) => {
  const { filters } = query;

  const timeStatement = getTimeStatement(query);

  const filterStatement = filters ? getFilterStatement(filters, siteId, timeStatement) : "";

  return `
    SELECT
      kv.1 AS propertyKey, -- Access tuple elements
      replaceRegexpAll(kv.2, '^"|"$', '') AS propertyValue, -- Remove surrounding quotes if they exist
      count() AS count
    FROM events
    ARRAY JOIN JSONExtractKeysAndValuesRaw(CAST(props AS String)) AS kv -- Alias the tuple elements directly
    WHERE
      site_id = {siteId:Int32}
      AND type = 'custom_event'
      AND event_name = {eventName:String}
      AND props != '{}' -- Check if the JSON object is not empty
      ${timeStatement}
      ${filterStatement}
    GROUP BY propertyKey, propertyValue
    ORDER BY propertyKey ASC, count DESC
    LIMIT 500
  `;
};

export const getEventProperties = analyticsRoute<GetEventPropertiesRequest>(
  "event properties",
  async (req: FastifyRequest<GetEventPropertiesRequest>, res: FastifyReply) => {
    const { event_name: eventName } = req.query;
    const site = req.params.siteId;

    if (!eventName) {
      return res.status(400).send({ error: "Event name is required" });
    }

    const data = await runAnalyticsQuery<GetEventPropertiesResponse[number]>({
      query: buildEventPropertiesQuery(req.query, Number(site)),
      params: {
        siteId: Number(site),
        eventName,
      },
    });

    return res.send({ data });
  }
);
