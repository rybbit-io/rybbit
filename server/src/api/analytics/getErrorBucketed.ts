import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import SqlString from "sqlstring";
import { validateTimeStatementFillParams } from "./utils/query-validation.js";
import { getTimeStatement, TimeBucketToFn, bucketIntervalMap } from "./utils/utils.js";
import { TimeBucket } from "./types.js";
import { getFilterStatement } from "./utils/getFilterStatement.js";
import { AnalyticsQueryError, runAnalyticsQuery } from "./utils/analyticsQuery.js";

function getTimeStatementFill(params: FilterParams, bucket: TimeBucket) {
  const { params: validatedParams, bucket: validatedBucket } = validateTimeStatementFillParams(params, bucket);

  if (validatedParams.start_date && validatedParams.end_date && validatedParams.time_zone) {
    const { start_date, end_date, time_zone } = validatedParams;
    return `WITH FILL FROM ${
      TimeBucketToFn[validatedBucket]
    }(toDateTime(${SqlString.escape(start_date)}, ${SqlString.escape(time_zone)}))
      TO if(
        toDate(${SqlString.escape(end_date)}) = toDate(now(), ${SqlString.escape(time_zone)}),
        ${TimeBucketToFn[validatedBucket]}(toTimeZone(now(), ${SqlString.escape(time_zone)})),
        ${TimeBucketToFn[validatedBucket]}(toDateTime(${SqlString.escape(end_date)}, ${SqlString.escape(
          time_zone
        )})) + INTERVAL 1 DAY
      ) STEP INTERVAL ${bucketIntervalMap[validatedBucket]}`;
  }
  if (validatedParams.start_datetime && validatedParams.end_datetime && validatedParams.time_zone) {
    const { start_datetime, end_datetime, time_zone } = validatedParams;
    return `WITH FILL FROM ${TimeBucketToFn[validatedBucket]}(
        toTimeZone(toDateTime(${SqlString.escape(start_datetime)}, 'UTC'), ${SqlString.escape(time_zone)})
      )
      TO ${TimeBucketToFn[validatedBucket]}(
        toTimeZone(toDateTime(${SqlString.escape(end_datetime)}, 'UTC'), ${SqlString.escape(time_zone)})
      )
      STEP INTERVAL ${bucketIntervalMap[validatedBucket]}`;
  }
  // For specific past minutes range - convert to exact timestamps for better performance
  if (validatedParams.past_minutes_start !== undefined && validatedParams.past_minutes_end !== undefined) {
    return `WITH FILL FROM now() - INTERVAL ${validatedParams.past_minutes_start} MINUTE
      TO now() - INTERVAL ${validatedParams.past_minutes_end} MINUTE
      STEP INTERVAL ${bucketIntervalMap[validatedBucket]}`;
  }

  throw new Error("Invalid time parameters");
}

interface GetErrorBucketedRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    bucket: TimeBucket;
    errorMessage: string;
  }>;
}

export type GetErrorBucketedResponse = {
  time: string;
  error_count: number;
}[];

export const buildErrorBucketedQuery = (query: GetErrorBucketedRequest["Querystring"], siteId: number) => {
  const { bucket } = query;
  const timeStatement = getTimeStatement(query);
  const filterStatement = getFilterStatement(query.filters, siteId, timeStatement);
  const timeStatementFill = getTimeStatementFill(query, bucket);

  return `
      SELECT
        ${TimeBucketToFn[bucket]}(toTimeZone(timestamp, {timeZone:String})) AS time,
        COUNT(*) AS error_count
      FROM events
      WHERE
        site_id = {siteId:Int32}
        AND type = 'error'
        AND JSONExtractString(toString(props), 'message') = {errorMessage:String}
        ${filterStatement}
        ${timeStatement}
      GROUP BY time
      ORDER BY time
      ${timeStatementFill}
    `;
};

export async function getErrorBucketed(req: FastifyRequest<GetErrorBucketedRequest>, res: FastifyReply) {
  const site = req.params.siteId;
  const { errorMessage } = req.query;

  if (!errorMessage) {
    return res.status(400).send({ error: "errorMessage parameter is required" });
  }

  const numericSiteId = Number(site);

  try {
    const data = await runAnalyticsQuery<GetErrorBucketedResponse[number]>({
      query: buildErrorBucketedQuery(req.query, numericSiteId),
      params: {
        siteId: numericSiteId,
        errorMessage: errorMessage,
        timeZone: req.query.time_zone || "UTC",
      },
    });

    return res.send({
      success: true,
      data: data,
    });
  } catch (error) {
    req.log.error(
      { err: error instanceof AnalyticsQueryError ? error.original : error },
      "Error getting error bucketed data"
    );
    return res.status(500).send({
      success: false,
      error: "Failed to get error data",
    });
  }
}
