import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import SqlString from "sqlstring";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { validateTimeStatementFillParams } from "./query-validation.js";
import { getFilterStatement, getTimeStatement, processResults, TimeBucketToFn, bucketIntervalMap } from "./utils.js";
import { TimeBucket } from "./types.js";

function getTimeStatementFill(params: FilterParams, bucket: TimeBucket) {
  const { params: validatedParams, bucket: validatedBucket } = validateTimeStatementFillParams(params, bucket);

  if (validatedParams.startDate && validatedParams.endDate && validatedParams.timeZone) {
    const { startDate, endDate, timeZone } = validatedParams;
    return `WITH FILL FROM toTimeZone(
      toDateTime(${TimeBucketToFn[validatedBucket]}(toDateTime(${SqlString.escape(startDate)}, ${SqlString.escape(
        timeZone
      )}))),
      'UTC'
      )
      TO if(
        toDate(${SqlString.escape(endDate)}) = toDate(now(), ${SqlString.escape(timeZone)}),
        now(),
        toTimeZone(
          toDateTime(${TimeBucketToFn[validatedBucket]}(toDateTime(${SqlString.escape(endDate)}, ${SqlString.escape(
            timeZone
          )}))) + INTERVAL 1 DAY,
          'UTC'
        )
      ) STEP INTERVAL ${bucketIntervalMap[validatedBucket]}`;
  }
  // For specific past minutes range - convert to exact timestamps for better performance
  if (validatedParams.pastMinutesStart !== undefined && validatedParams.pastMinutesEnd !== undefined) {
    const { pastMinutesStart: start, pastMinutesEnd: end } = validatedParams;

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

const getQuery = (params: FilterParams<{ bucket: TimeBucket }>) => {
  const { startDate, endDate, timeZone, bucket, filters, pastMinutesStart, pastMinutesEnd } = params;
  const filterStatement = getFilterStatement(filters);

  const pastMinutesRange =
    pastMinutesStart !== undefined && pastMinutesEnd !== undefined
      ? { start: Number(pastMinutesStart), end: Number(pastMinutesEnd) }
      : undefined;

  const isAllTime = !startDate && !endDate && !pastMinutesRange;

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
         toDateTime(${TimeBucketToFn[bucket]}(toTimeZone(start_time, ${SqlString.escape(timeZone)}))) AS time,
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
        toDateTime(${TimeBucketToFn[bucket]}(toTimeZone(timestamp, ${SqlString.escape(timeZone)}))) AS time,
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
  const { startDate, endDate, timeZone, bucket, filters, pastMinutesStart, pastMinutesEnd } = req.query;
  const site = req.params.site;

  const query = getQuery({
    startDate,
    endDate,
    timeZone,
    bucket,
    filters,
    pastMinutesStart,
    pastMinutesEnd,
  });

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
