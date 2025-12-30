import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { getTimeStatement, processResults } from "../utils/utils.js";
import { getFilterStatement } from "../utils/getFilterStatement.js";
import { FilterParams } from "@rybbit/shared";

export type GetEventPropertyBreakdownResponse = {
  value: string;
  count: number;
  percentage: number;
}[];

export interface GetEventPropertyBreakdownRequest {
  Params: {
    site: string;
  };
  Querystring: FilterParams<{
    eventName: string;
    propertyKey: string;
    limit?: number;
  }>;
}

export async function getEventPropertyBreakdown(
  req: FastifyRequest<GetEventPropertyBreakdownRequest>,
  res: FastifyReply
) {
  const { eventName, propertyKey, limit, filters } = req.query;
  const site = req.params.site;

  if (!eventName) {
    return res.status(400).send({ error: "Event name is required" });
  }

  if (!propertyKey) {
    return res.status(400).send({ error: "Property key is required" });
  }

  const timeStatement = getTimeStatement(req.query);
  const filterStatement = filters ? getFilterStatement(filters) : "";
  const validatedLimit = limit && !isNaN(parseInt(String(limit), 10)) ? parseInt(String(limit), 10) : 100;

  const query = `
    WITH PropertyValues AS (
      SELECT
        JSONExtractString(toString(props), {propertyKey:String}) AS value,
        count() AS count
      FROM events
      WHERE
        site_id = {siteId:Int32}
        AND type = 'custom_event'
        AND event_name = {eventName:String}
        AND JSONHas(toString(props), {propertyKey:String})
        AND JSONExtractString(toString(props), {propertyKey:String}) != ''
        ${timeStatement}
        ${filterStatement}
      GROUP BY value
    )
    SELECT
      value,
      count,
      round((count * 100.0 / sum(count) OVER ()), 2) as percentage
    FROM PropertyValues
    ORDER BY count DESC
    LIMIT ${validatedLimit}
  `;

  try {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteId: Number(site),
        eventName,
        propertyKey,
      },
    });

    const data = await processResults<GetEventPropertyBreakdownResponse[number]>(result);
    return res.send({ data });
  } catch (error) {
    console.error("Generated Query:", query);
    console.error("Error fetching event property breakdown:", error);
    return res.status(500).send({ error: "Failed to fetch event property breakdown" });
  }
}
