import { FastifyReply, FastifyRequest } from "fastify";
import clickhouse from "../../db/clickhouse/clickhouse.js";
import {
  getFilterStatement,
  getTimeStatement,
  processResults,
} from "./utils.js";
import SqlString from "sqlstring";
import { getUserHasAccessToSitePublic } from "../../lib/auth-utils.js";
import { validateTimeStatementFillParams } from "./query-validation.js";

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

function getTimeStatementFill(
  {
    date,
    pastMinutes,
    pastMinutesRange,
  }: {
    date?: { startDate: string; endDate: string; timezone: string };
    pastMinutes?: number;
    pastMinutesRange?: { start: number; end: number };
  },
  bucket: TimeBucket
) {
  const { params, bucket: validatedBucket } = validateTimeStatementFillParams(
    { date, pastMinutes, pastMinutesRange },
    bucket
  );

  if (params.date) {
    const { startDate, endDate, timezone } = params.date;
    return `WITH FILL FROM toTimeZone(
      toDateTime(${
        TimeBucketToFn[validatedBucket]
      }(toDateTime(${SqlString.escape(startDate)}, ${SqlString.escape(
      timezone
    )}))),
      'UTC'
      )
      TO if(
        toDate(${SqlString.escape(endDate)}) = toDate(now(), ${SqlString.escape(
      timezone
    )}),
        now(),
        toTimeZone(
          toDateTime(${
            TimeBucketToFn[validatedBucket]
          }(toDateTime(${SqlString.escape(endDate)}, ${SqlString.escape(
      timezone
    )}))) + INTERVAL 1 DAY,
          'UTC'
        )
      ) STEP INTERVAL ${bucketIntervalMap[validatedBucket]}`;
  }
  // For specific past minutes range
  if (params.pastMinutesRange) {
    const { start, end } = params.pastMinutesRange;
    return ` WITH FILL 
      FROM ${
        TimeBucketToFn[validatedBucket]
      }(toDateTime(now() - INTERVAL ${SqlString.escape(start)} MINUTE))
      TO ${
        TimeBucketToFn[validatedBucket]
      }(toDateTime(now() - INTERVAL ${SqlString.escape(
      end
    )} MINUTE)) + INTERVAL 1 ${
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
  // For regular past minutes
  if (params.pastMinutes) {
    return ` WITH FILL 
      FROM ${
        TimeBucketToFn[validatedBucket]
      }(toDateTime(now() - INTERVAL ${SqlString.escape(
      params.pastMinutes
    )} MINUTE))
      TO ${TimeBucketToFn[validatedBucket]}(toDateTime(now())) + INTERVAL 1 ${
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

const getQuery = ({
  startDate,
  endDate,
  timezone,
  bucket,
  site,
  filters,
  pastMinutes,
  pastMinutesRange,
}: {
  startDate: string;
  endDate: string;
  timezone: string;
  bucket: TimeBucket;
  site: string;
  filters: string;
  pastMinutes?: number;
  pastMinutesRange?: { start: number; end: number };
}) => {
  const filterStatement = getFilterStatement(filters);

  const isAllTime = !startDate && !endDate && !pastMinutes && !pastMinutesRange;

  const timeParams = pastMinutesRange
    ? { pastMinutesRange }
    : pastMinutes
    ? { pastMinutes }
    : { date: { startDate, endDate, timezone } };

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
         }(toTimeZone(start_time, ${SqlString.escape(timezone)}))) AS time,
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
            ${getTimeStatement(timeParams)}
            AND type = 'pageview'
        GROUP BY session_id
    )
    GROUP BY time ORDER BY time ${
      isAllTime ? "" : getTimeStatementFill(timeParams, bucket)
    }
) AS session_stats
FULL JOIN
(
    SELECT
         toDateTime(${
           TimeBucketToFn[bucket]
         }(toTimeZone(timestamp, ${SqlString.escape(timezone)}))) AS time,
        COUNT(*) AS pageviews,
        COUNT(DISTINCT user_id) AS users
    FROM events
    WHERE
        site_id = {siteId:Int32}
        ${filterStatement}
        ${getTimeStatement(timeParams)}
        AND type = 'pageview'
    GROUP BY time ORDER BY time ${
      isAllTime ? "" : getTimeStatementFill(timeParams, bucket)
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
    Querystring: {
      startDate: string;
      endDate: string;
      timezone: string;
      bucket: TimeBucket;
      filters: string;
      pastMinutes?: number;
      pastMinutesStart?: number;
      pastMinutesEnd?: number;
    };
  }>,
  res: FastifyReply
) {
  const {
    startDate,
    endDate,
    timezone,
    bucket,
    filters,
    pastMinutes,
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
    timezone,
    bucket,
    site,
    filters,
    pastMinutes: pastMinutes ? Number(pastMinutes) : undefined,
    pastMinutesRange,
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
