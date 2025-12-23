import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import SqlString from "sqlstring";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { validateTimeStatementFillParams } from "./utils/query-validation.js";
import { getTimeStatement, TimeBucketToFn, bucketIntervalMap, processResults } from "./utils/utils.js";
import { TimeBucket } from "./types.js";
import { getFilterStatement } from "./utils/getFilterStatement.js";

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
    site: string;
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

export async function getErrorBucketed(req: FastifyRequest<GetErrorBucketedRequest>, res: FastifyReply) {
  const site = req.params.site;
  const { bucket, errorMessage } = req.query;

  if (!errorMessage) {
    return res.status(400).send({ error: "errorMessage parameter is required" });
  }

  const numericSiteId = Number(site);
  const timeStatement = getTimeStatement(req.query);
  const filterStatement = getFilterStatement(req.query.filters, numericSiteId, timeStatement);
  const timeStatementFill = getTimeStatementFill(req.query, bucket);

  try {
    const query = `
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

    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteId: numericSiteId,
        errorMessage: errorMessage,
        timeZone: req.query.time_zone || "UTC",
      },
    });

    const data = await processResults<GetErrorBucketedResponse>(result);

    return res.send({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error("Error getting error bucketed data:", error);
    return res.status(500).send({
      success: false,
      error: "Failed to get error data",
    });
  }
}
