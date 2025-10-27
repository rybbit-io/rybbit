import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import SqlString from "sqlstring";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { validateTimeStatementFillParams } from "./query-validation.js";
import { getFilterStatement, getTimeStatement, TimeBucketToFn, bucketIntervalMap, processResults } from "./utils.js";
import { TimeBucket } from "./types.js";

function getTimeStatementFill(params: FilterParams, bucket: TimeBucket) {
  const { params: validatedParams, bucket: validatedBucket } = validateTimeStatementFillParams(params, bucket);

  if (validatedParams.startDate && validatedParams.endDate && validatedParams.timeZone) {
    const { startDate, endDate, timeZone } = validatedParams;
    return `WITH FILL FROM ${
      TimeBucketToFn[validatedBucket]
    }(toDateTime(${SqlString.escape(startDate)}, ${SqlString.escape(timeZone)}))
      TO if(
        toDate(${SqlString.escape(endDate)}) = toDate(now(), ${SqlString.escape(timeZone)}),
        ${TimeBucketToFn[validatedBucket]}(toTimeZone(now(), ${SqlString.escape(timeZone)})),
        ${TimeBucketToFn[validatedBucket]}(toDateTime(${SqlString.escape(endDate)}, ${SqlString.escape(
          timeZone
        )})) + INTERVAL 1 DAY
      ) STEP INTERVAL ${bucketIntervalMap[validatedBucket]}`;
  }
  // For specific past minutes range - convert to exact timestamps for better performance
  if (validatedParams.pastMinutesStart !== undefined && validatedParams.pastMinutesEnd !== undefined) {
    return `WITH FILL FROM now() - INTERVAL ${validatedParams.pastMinutesStart} MINUTE
      TO now() - INTERVAL ${validatedParams.pastMinutesEnd} MINUTE
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
  const filterStatement = getFilterStatement(req.query.filters);
  const timeStatement = getTimeStatement(req.query);
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
        timeZone: req.query.timeZone || "UTC",
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
