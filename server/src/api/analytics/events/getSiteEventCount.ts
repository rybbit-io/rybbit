import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { TimeBucket } from "../types.js";
import { getFilterStatement } from "../utils/getFilterStatement.js";
import { getTimeStatement, processResults, TimeBucketToFn } from "../utils/utils.js";

export type GetSiteEventCountResponse = {
  time: string;
  pageview_count: number;
  custom_event_count: number;
  performance_count: number;
  outbound_count: number;
  error_count: number;
  button_click_count: number;
  copy_count: number;
  form_submit_count: number;
  input_change_count: number;
  event_count: number;
}[];

interface GetSiteEventCountRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    bucket: TimeBucket;
  }>;
}

export async function getSiteEventCount(
  req: FastifyRequest<GetSiteEventCountRequest>,
  res: FastifyReply
) {
  const site = req.params.siteId;
  const { bucket = "day" } = req.query;
  const timeZone = req.query.time_zone || "UTC";

  if (!TimeBucketToFn[bucket]) {
    return res.status(400).send({ error: `Invalid bucket value: ${bucket}` });
  }

  const timeStatement = getTimeStatement(req.query);
  const filterStatement = getFilterStatement(req.query.filters, Number(site), timeStatement);

  const query = `
    SELECT
      toDateTime(${TimeBucketToFn[bucket]}(toTimeZone(timestamp, {timeZone:String}))) AS time,
      countIf(type = 'pageview') as pageview_count,
      countIf(type = 'custom_event') as custom_event_count,
      countIf(type = 'performance') as performance_count,
      countIf(type = 'outbound') as outbound_count,
      countIf(type = 'error') as error_count,
      countIf(type = 'button_click') as button_click_count,
      countIf(type = 'copy') as copy_count,
      countIf(type = 'form_submit') as form_submit_count,
      countIf(type = 'input_change') as input_change_count,
      count() as event_count
    FROM events
    WHERE
      site_id = {siteId:Int32}
      AND type IN ('pageview', 'custom_event', 'performance', 'outbound', 'error', 'button_click', 'copy', 'form_submit', 'input_change')
      ${timeStatement}
      ${filterStatement}
    GROUP BY time
    ORDER BY time
  `;

  try {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteId: Number(site),
        timeZone,
      },
    });

    const data = await processResults<GetSiteEventCountResponse[number]>(result);
    return res.send({ data });
  } catch (error) {
    console.error("Generated Query:", query);
    console.error("Error fetching site event count:", error);
    return res.status(500).send({ error: "Failed to fetch site event count" });
  }
}
