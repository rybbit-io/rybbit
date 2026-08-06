import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { TimeBucket } from "../types.js";
import { getFilterStatement } from "../utils/getFilterStatement.js";
import { getTimeStatement, TimeBucketToFn } from "../utils/utils.js";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";

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

export const buildSiteEventCountQuery = (query: GetSiteEventCountRequest["Querystring"], siteId: number) => {
  const { bucket = "day" } = query;

  const timeStatement = getTimeStatement(query);
  const filterStatement = getFilterStatement(query.filters, siteId, timeStatement);

  return `
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
};

export const getSiteEventCount = analyticsRoute<GetSiteEventCountRequest>(
  "site event count",
  async (req: FastifyRequest<GetSiteEventCountRequest>, res: FastifyReply) => {
    const site = req.params.siteId;
    const { bucket = "day" } = req.query;
    const timeZone = req.query.time_zone || "UTC";

    if (!TimeBucketToFn[bucket]) {
      return res.status(400).send({ error: `Invalid bucket value: ${bucket}` });
    }

    const data = await runAnalyticsQuery<GetSiteEventCountResponse[number]>({
      query: buildSiteEventCountQuery(req.query, Number(site)),
      params: {
        siteId: Number(site),
        timeZone,
      },
    });

    return res.send({ data });
  }
);
