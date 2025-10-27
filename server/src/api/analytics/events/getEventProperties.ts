import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { getTimeStatement, processResults, getFilterStatement } from "../utils.js";
import { FilterParams } from "@rybbit/shared";

export type GetEventPropertiesResponse = {
  propertyKey: string;
  propertyValue: string;
  count: number;
}[];

export interface GetEventPropertiesRequest {
  Params: {
    site: string;
  };
  Querystring: FilterParams<{
    eventName: string;
  }>;
}

export async function getEventProperties(req: FastifyRequest<GetEventPropertiesRequest>, res: FastifyReply) {
  const { startDate, endDate, timeZone, eventName, filters, pastMinutesStart, pastMinutesEnd } = req.query;
  const site = req.params.site;

  if (!eventName) {
    return res.status(400).send({ error: "Event name is required" });
  }

  const timeStatement = getTimeStatement(req.query);

  const filterStatement = filters ? getFilterStatement(filters) : "";

  const query = `
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

  try {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteId: Number(site),
        eventName,
      },
    });

    const data = await processResults<GetEventPropertiesResponse[number]>(result);
    return res.send({ data });
  } catch (error) {
    console.error("Generated Query:", query);
    console.error("Error fetching event properties:", error);
    return res.status(500).send({ error: "Failed to fetch event properties" });
  }
}
