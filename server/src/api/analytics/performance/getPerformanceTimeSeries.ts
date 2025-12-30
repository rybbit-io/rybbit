import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { getTimeStatement, processResults, TimeBucketToFn, bucketIntervalMap } from "../utils/utils.js";
import SqlString from "sqlstring";
import { validateTimeStatementFillParams } from "../utils/query-validation.js";
import { TimeBucket, PerformanceTimeSeriesPoint } from "../types.js";
import { FilterParams } from "@rybbit/shared";
import { getFilterStatement } from "../utils/getFilterStatement.js";

function getTimeStatementFill(params: FilterParams, bucket: TimeBucket) {
  const { params: validatedParams, bucket: validatedBucket } = validateTimeStatementFillParams(params, bucket);

  if (validatedParams.start_date && validatedParams.end_date && validatedParams.time_zone) {
    const { start_date, end_date, time_zone } = validatedParams;
    return `WITH FILL FROM toTimeZone(
      toDateTime(${TimeBucketToFn[validatedBucket]}(toDateTime(${SqlString.escape(start_date)}, ${SqlString.escape(
        time_zone
      )}))),
      'UTC'
      )
      TO if(
        toDate(${SqlString.escape(end_date)}) = toDate(now(), ${SqlString.escape(time_zone)}),
        now(),
        toTimeZone(
          toDateTime(${TimeBucketToFn[validatedBucket]}(toDateTime(${SqlString.escape(end_date)}, ${SqlString.escape(
            time_zone
          )}))) + INTERVAL 1 DAY,
          'UTC'
        )
      ) STEP INTERVAL ${bucketIntervalMap[validatedBucket]}`;
  }
  // For specific past minutes range - convert to exact timestamps for better performance
  if (validatedParams.past_minutes_start !== undefined && validatedParams.past_minutes_end !== undefined) {
    const { past_minutes_start: start, past_minutes_end: end } = validatedParams;

    // Calculate exact timestamps in JavaScript to avoid runtime ClickHouse calculations
    const now = new Date();
    const startTimestamp = new Date(now.getTime() - start * 60 * 1000);
    const endTimestamp = new Date(now.getTime() - end * 60 * 1000);

    // Format as YYYY-MM-DD HH:MM:SS without milliseconds for ClickHouse
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

const getQuery = (params: FilterParams<{ bucket: TimeBucket }>, siteId: number) => {
  const { start_date, end_date, time_zone, bucket = "hour", filters, past_minutes_start, past_minutes_end } = params;
  const timeStatement = getTimeStatement(params);
  const filterStatement = getFilterStatement(filters, siteId, timeStatement);

  const isAllTime = !start_date && !end_date && !past_minutes_start && !past_minutes_end;

  const query = `
SELECT
    toDateTime(${TimeBucketToFn[bucket]}(toTimeZone(timestamp, ${SqlString.escape(time_zone)}))) AS time,
    quantile(0.5)(lcp) AS lcp_p50,
    quantile(0.75)(lcp) AS lcp_p75,
    quantile(0.9)(lcp) AS lcp_p90,
    quantile(0.99)(lcp) AS lcp_p99,
    quantile(0.5)(cls) AS cls_p50,
    quantile(0.75)(cls) AS cls_p75,
    quantile(0.9)(cls) AS cls_p90,
    quantile(0.99)(cls) AS cls_p99,
    quantile(0.5)(inp) AS inp_p50,
    quantile(0.75)(inp) AS inp_p75,
    quantile(0.9)(inp) AS inp_p90,
    quantile(0.99)(inp) AS inp_p99,
    quantile(0.5)(fcp) AS fcp_p50,
    quantile(0.75)(fcp) AS fcp_p75,
    quantile(0.9)(fcp) AS fcp_p90,
    quantile(0.99)(fcp) AS fcp_p99,
    quantile(0.5)(ttfb) AS ttfb_p50,
    quantile(0.75)(ttfb) AS ttfb_p75,
    quantile(0.9)(ttfb) AS ttfb_p90,
    quantile(0.99)(ttfb) AS ttfb_p99,
    COUNT(*) AS event_count
FROM events
WHERE
    site_id = {siteId:Int32}
    AND type = 'performance'
    ${filterStatement}
    ${timeStatement}
GROUP BY time ORDER BY time ${isAllTime ? "" : getTimeStatementFill(params, bucket)}`;

  return query;
};

export async function getPerformanceTimeSeries(
  req: FastifyRequest<{
    Params: {
      site: string;
    };
    Querystring: FilterParams<{
      bucket: TimeBucket;
    }>;
  }>,
  res: FastifyReply
) {
  const site = req.params.site;

  const query = getQuery(req.query, Number(site));

  try {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteId: Number(site),
      },
    });

    const data = await processResults<PerformanceTimeSeriesPoint>(result);
    return res.send({ data });
  } catch (error) {
    console.error("Error fetching performance time series:", error);
    return res.status(500).send({ error: "Failed to fetch performance time series" });
  }
}
