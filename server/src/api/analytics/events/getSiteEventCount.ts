import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import SqlString from "sqlstring";
import { TimeBucket } from "../types.js";
import { getFilterStatement } from "../utils/getFilterStatement.js";
import { validateTimeStatementFillParams } from "../utils/query-validation.js";
import { getTimeStatement, TimeBucketToFn, bucketIntervalMap } from "../utils/utils.js";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";

function getTimeStatementFill(params: FilterParams, bucket: TimeBucket) {
  const { params: validatedParams, bucket: validatedBucket } = validateTimeStatementFillParams(params, bucket);

  if (validatedParams.start_date && validatedParams.end_date && validatedParams.time_zone) {
    const { start_date, end_date, time_zone } = validatedParams;
    return `WITH FILL FROM toTimeZone(
      toDateTime(${TimeBucketToFn[validatedBucket]}(toDateTime(${SqlString.escape(start_date)}, ${SqlString.escape(time_zone)}))),
      'UTC'
      )
      TO if(
        toDate(${SqlString.escape(end_date)}) = toDate(now(), ${SqlString.escape(time_zone)}),
        now(),
        toTimeZone(
          toDateTime(${TimeBucketToFn[validatedBucket]}(toDateTime(${SqlString.escape(end_date)}, ${SqlString.escape(time_zone)}))) + INTERVAL 1 DAY,
          'UTC'
        )
      ) STEP INTERVAL ${bucketIntervalMap[validatedBucket]}`;
  }

  if (validatedParams.past_minutes_start !== undefined && validatedParams.past_minutes_end !== undefined) {
    const { past_minutes_start: start, past_minutes_end: end } = validatedParams;
    const now = new Date();
    const startTimestamp = new Date(now.getTime() - start * 60 * 1000);
    const endTimestamp = new Date(now.getTime() - end * 60 * 1000);
    const startIso = startTimestamp.toISOString().slice(0, 19).replace("T", " ");
    const endIso = endTimestamp.toISOString().slice(0, 19).replace("T", " ");

    return ` WITH FILL
      FROM ${TimeBucketToFn[validatedBucket]}(toDateTime(${SqlString.escape(startIso)}))
      TO ${TimeBucketToFn[validatedBucket]}(toDateTime(${SqlString.escape(endIso)})) + INTERVAL 1 ${
        validatedBucket === "minute"
          ? "MINUTE"
          : validatedBucket === "five_minutes"
            ? "MINUTE"
            : validatedBucket === "ten_minutes"
              ? "MINUTE"
              : validatedBucket === "fifteen_minutes"
                ? "MINUTE"
                : validatedBucket === "month"
                  ? "MONTH"
                  : validatedBucket === "week"
                    ? "WEEK"
                    : validatedBucket === "day"
                      ? "DAY"
                      : "HOUR"
      }
      STEP INTERVAL ${bucketIntervalMap[validatedBucket]}`;
  }

  return "";
}

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
  ad_click_count: number;
  ad_impression_count: number;
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

  const { start_date, end_date, past_minutes_start, past_minutes_end } = query;
  const pastMinutesRange =
    past_minutes_start !== undefined && past_minutes_end !== undefined
      ? { start: Number(past_minutes_start), end: Number(past_minutes_end) }
      : undefined;
  const isAllTime = !start_date && !end_date && !pastMinutesRange;
  const fillStatement = isAllTime ? "" : getTimeStatementFill(query, bucket);

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
      countIf(type = 'ad_click') as ad_click_count,
      countIf(type = 'ad_impression') as ad_impression_count,
      count() as event_count
    FROM events
    WHERE
      site_id = {siteId:Int32}
      AND type IN ('pageview', 'custom_event', 'performance', 'outbound', 'error', 'button_click', 'copy', 'form_submit', 'input_change', 'ad_click', 'ad_impression')
      ${timeStatement}
      ${filterStatement}
    GROUP BY time
    ORDER BY time ${fillStatement}
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
