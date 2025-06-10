import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import SqlString from "sqlstring";
import clickhouse from "../../db/clickhouse/clickhouse.js";
import { getUserHasAccessToSitePublic } from "../../lib/auth-utils.js";
import { validateTimeStatementFillParams } from "./query-validation.js";
import {
  getFilterStatement,
  getTimeStatement,
  processResults,
} from "./utils.js";

const TimeBucketToFn = {
  minute: "toStartOfMinute",
  five_minutes: "toStartOfFiveMinutes",
  ten_minutes: "toStartOfTenMinutes",
  fifteen_minutes: "toStartOfFifteenMinutes",
  hour: "toStartOfHour",
  day: "toStartOfDay",
  week: "toStartOfWeek",
  month: "toStartOfMonth",
  year: "toStartOfYear",
};

const bucketIntervalMap = {
  minute: "1 MINUTE",
  five_minutes: "5 MINUTES",
  ten_minutes: "10 MINUTES",
  fifteen_minutes: "15 MINUTES",
  hour: "1 HOUR",
  day: "1 DAY",
  week: "7 DAY",
  month: "1 MONTH",
  year: "1 YEAR",
} as const;

function getTimeStatementFill(params: FilterParams, bucket: TimeBucket) {
  const { params: validatedParams, bucket: validatedBucket } =
    validateTimeStatementFillParams(params, bucket);

  if (
    validatedParams.startDate &&
    validatedParams.endDate &&
    validatedParams.timeZone
  ) {
    const { startDate, endDate, timeZone } = validatedParams;
    return `WITH FILL FROM toTimeZone(
      toDateTime(${
        TimeBucketToFn[validatedBucket]
      }(toDateTime(${SqlString.escape(startDate)}, ${SqlString.escape(
        timeZone
      )}))),
      'UTC'
      )
      TO if(
        toDate(${SqlString.escape(endDate)}) = toDate(now(), ${SqlString.escape(
          timeZone
        )}),
        now(),
        toTimeZone(
          toDateTime(${
            TimeBucketToFn[validatedBucket]
          }(toDateTime(${SqlString.escape(endDate)}, ${SqlString.escape(
            timeZone
          )}))) + INTERVAL 1 DAY,
          'UTC'
        )
      ) STEP INTERVAL ${bucketIntervalMap[validatedBucket]}`;
  }
  // For specific past minutes range - convert to exact timestamps for better performance
  if (
    validatedParams.pastMinutesStart !== undefined &&
    validatedParams.pastMinutesEnd !== undefined
  ) {
    const { pastMinutesStart: start, pastMinutesEnd: end } = validatedParams;

    // Calculate exact timestamps in JavaScript to avoid runtime ClickHouse calculations
    const now = new Date();
    const startTimestamp = new Date(now.getTime() - start * 60 * 1000);
    const endTimestamp = new Date(now.getTime() - end * 60 * 1000);

    // Format as YYYY-MM-DD HH:MM:SS without milliseconds for ClickHouse
    const startIso = startTimestamp
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");
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
  const {
    startDate,
    endDate,
    timeZone,
    bucket,
    filters,
    pastMinutesStart,
    pastMinutesEnd,
  } = params;
  const filterStatement = getFilterStatement(filters);

  const pastMinutesRange =
    pastMinutesStart !== undefined && pastMinutesEnd !== undefined
      ? { start: Number(pastMinutesStart), end: Number(pastMinutesEnd) }
      : undefined;

  const isAllTime = !startDate && !endDate && !pastMinutesRange;

  const query = `
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
         toDateTime(${
           TimeBucketToFn[bucket]
         }(toTimeZone(start_time, ${SqlString.escape(timeZone)}))) AS time,
        COUNT() AS sessions,
        AVG(pages_in_session) AS pages_per_session,
        sumIf(1, pages_in_session = 1) / COUNT() AS bounce_rate,
        AVG(end_time - start_time) AS session_duration
    FROM
    (
        /* One row per session */
        SELECT
            session_id,
            MIN(timestamp) AS start_time,
            MAX(timestamp) AS end_time,
            COUNT(*) AS pages_in_session
        FROM events
        WHERE 
            site_id = {siteId:Int32}
            ${filterStatement}
            ${getTimeStatement(params)}
            AND type = 'pageview'
        GROUP BY session_id
    )
    GROUP BY time ORDER BY time ${
      isAllTime ? "" : getTimeStatementFill(params, bucket)
    }
) AS session_stats
FULL JOIN
(
    SELECT
         toDateTime(${
           TimeBucketToFn[bucket]
         }(toTimeZone(timestamp, ${SqlString.escape(timeZone)}))) AS time,
        COUNT(*) AS pageviews,
        COUNT(DISTINCT user_id) AS users
    FROM events
    WHERE
        site_id = {siteId:Int32}
        ${filterStatement}
        ${getTimeStatement(params)}
        AND type = 'pageview'
    GROUP BY time ORDER BY time ${
      isAllTime ? "" : getTimeStatementFill(params, bucket)
    }
) AS page_stats
USING time
ORDER BY time`;

  return query;
};

type TimeBucket =
  | "minute"
  | "five_minutes"
  | "ten_minutes"
  | "fifteen_minutes"
  | "hour"
  | "day"
  | "week"
  | "month"
  | "year";

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
  const {
    startDate,
    endDate,
    timeZone,
    bucket,
    filters,
    pastMinutesStart,
    pastMinutesEnd,
  } = req.query;
  const site = req.params.site;

  const userHasAccessToSite = await getUserHasAccessToSitePublic(req, site);
  if (!userHasAccessToSite) {
    return res.status(403).send({ error: "Forbidden" });
  }

  // Handle specific past minutes range if provided
  const pastMinutesRange =
    pastMinutesStart && pastMinutesEnd
      ? { start: Number(pastMinutesStart), end: Number(pastMinutesEnd) }
      : undefined;

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
