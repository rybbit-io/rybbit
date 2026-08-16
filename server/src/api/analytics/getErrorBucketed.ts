import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { parseTimeWindow, TimeBucketToFn, timeWindowFill, timeWindowWhere } from "./utils/timeWindow.js";
import { TimeBucket } from "./types.js";
import { getFilterStatement } from "./utils/getFilterStatement.js";
import { AnalyticsQueryError, runAnalyticsQuery } from "./utils/analyticsQuery.js";

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
  // The bucket column is lifted to DateTime like every other bucketed surface:
  // toStartOfWeek/Month/Year return Date, and a Date order key cannot be filled
  // from the Time Window's DateTime bounds.
  const { bucket } = query;
  const timeWindow = parseTimeWindow(query);
  const timeStatement = timeWindowWhere(timeWindow);
  const filterStatement = getFilterStatement(query.filters, siteId, timeStatement);
  const timeStatementFill = timeWindowFill(timeWindow, bucket);

  return `
      SELECT
        toDateTime(${TimeBucketToFn[bucket]}(toTimeZone(timestamp, {timeZone:String}))) AS time,
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
