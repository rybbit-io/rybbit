import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import SqlString from "sqlstring";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { validateTimeStatementFillParams } from "./utils/query-validation.js";
import { getTimeStatement, processResults, TimeBucketToFn, bucketIntervalMap } from "./utils/utils.js";
import { getFilterStatement } from "./utils/getFilterStatement.js";
import { TimeBucket } from "./types.js";

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

  const pastMinutesRange =
    past_minutes_start !== undefined && past_minutes_end !== undefined
      ? { start: Number(past_minutes_start), end: Number(past_minutes_end) }
      : undefined;

  const isAllTime = !start_date && !end_date && !pastMinutesRange;

  const query = `
WITH
-- First, calculate total pageviews per session (no parameter filters)
AllSessionPageviews AS (
    SELECT
        session_id,
        countIf(type = 'pageview') AS total_pageviews_in_session
    FROM events
    WHERE
        site_id = {siteId:Int32}
        ${getTimeStatement(params)}
    GROUP BY session_id
),
-- Then get session data with filters applied
FilteredSessions AS (
    SELECT
        session_id,
        MIN(timestamp) AS start_time,
        MAX(timestamp) AS end_time
    FROM events
    WHERE
        site_id = {siteId:Int32}
        ${filterStatement}
        ${getTimeStatement(params)}
    GROUP BY session_id
),
-- Join to get sessions with their total pageviews
SessionsWithPageviews AS (
    SELECT
        fs.session_id,
        fs.start_time,
        fs.end_time,
        asp.total_pageviews_in_session
    FROM FilteredSessions fs
    LEFT JOIN AllSessionPageviews asp ON fs.session_id = asp.session_id
)
SELECT
    session_stats.time AS time,
    session_stats.sessions,
    session_stats.pages_per_session,
    session_stats.bounce_rate * 100 AS bounce_rate,
    session_stats.session_duration,
    page_stats.pageviews,
    page_stats.users
FROM
(
    SELECT
         toDateTime(${TimeBucketToFn[bucket]}(toTimeZone(start_time, ${SqlString.escape(time_zone)}))) AS time,
        COUNT() AS sessions,
        AVG(total_pageviews_in_session) AS pages_per_session,
        sumIf(1, total_pageviews_in_session = 1) / COUNT() AS bounce_rate,
        AVG(end_time - start_time) AS session_duration
    FROM SessionsWithPageviews
    GROUP BY time ORDER BY time ${isAllTime ? "" : getTimeStatementFill(params, bucket)}
) AS session_stats
FULL JOIN
(
    SELECT
        toDateTime(${TimeBucketToFn[bucket]}(toTimeZone(timestamp, ${SqlString.escape(time_zone)}))) AS time,
        countIf(type = 'pageview') AS pageviews,
        COUNT(DISTINCT user_id) AS users
    FROM events
    WHERE
        site_id = {siteId:Int32}
        ${filterStatement}
        ${getTimeStatement(params)}
    GROUP BY time ORDER BY time ${isAllTime ? "" : getTimeStatementFill(params, bucket)}
) AS page_stats
USING time
ORDER BY time`;

  return query;
};

type getOverviewBucketed = { time: string; pageviews: number }[];

export async function getOverviewBucketed(
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
  const { start_date, end_date, time_zone, bucket, filters, past_minutes_start, past_minutes_end } = req.query;
  const site = req.params.site;

  const query = getQuery(
    {
      start_date,
      end_date,
      time_zone,
      bucket,
      filters,
      past_minutes_start,
      past_minutes_end,
    },
    Number(site)
  );

  try {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteId: Number(site),
      },
    });

    const data = await processResults<getOverviewBucketed[number]>(result);
    return res.send({ data });
  } catch (error) {
    console.error("Error fetching pageviews:", error);
    return res.status(500).send({ error: "Failed to fetch pageviews" });
  }
}
