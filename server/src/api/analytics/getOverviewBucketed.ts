import { FastifyReply, FastifyRequest } from "fastify";
import clickhouse from "../../db/clickhouse/clickhouse.js";
import {
  getFilterStatement,
  getTimeStatement,
  processResults,
} from "./utils.js";
import { getUserHasAccessToSitePublic } from "../../lib/auth-utils.js";

type TimeBucket = "hour" | "day" | "week" | "month";

interface GetOverviewBucketedRequest {
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
  };
}

type GetOverviewBucketedResponse = {
  time: string;
  pageviews: number;
  sessions: number;
  pages_per_session: number;
  bounce_rate: number;
  session_duration: number;
  users: number;
}[];

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
  }: {
    date?: { startDate: string; endDate: string; timezone: string };
    pastMinutes?: number;
  },
  bucket: TimeBucket
) {
  if (date) {
    const { startDate, endDate, timezone } = date;
    return `WITH FILL FROM toTimeZone(
      toDateTime(${TimeBucketToFn[bucket]}(toDateTime('${startDate}', '${timezone}'))),
      'UTC'
      )
      TO if(
        toDate('${endDate}') = toDate(now(), '${timezone}'),
        now(),
        toTimeZone(
          toDateTime(${TimeBucketToFn[bucket]}(toDateTime('${endDate}', '${timezone}'))) + INTERVAL 1 DAY,
          'UTC'
        )
      ) STEP INTERVAL ${bucketIntervalMap[bucket]}`;
  }
  if (pastMinutes) {
    return `WITH FILL FROM now() - INTERVAL ${pastMinutes} MINUTE TO now() STEP INTERVAL ${bucketIntervalMap[bucket]}`;
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
}: GetOverviewBucketedRequest["Params"] & GetOverviewBucketedRequest["Querystring"]) => {
  const filterStatement = getFilterStatement(filters);

  const isAllTime = !startDate && !endDate;

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
         }(toTimeZone(start_time, '${timezone}'))) AS time,
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
            site_id = ${site}
            ${filterStatement}
            ${getTimeStatement(
              pastMinutes
                ? { pastMinutes }
                : {
                    date: { startDate, endDate, timezone },
                  }
            )}
            AND type = 'pageview'
        GROUP BY session_id
    )
    GROUP BY time ORDER BY time ${
      isAllTime
        ? ""
        : getTimeStatementFill(
            pastMinutes
              ? { pastMinutes }
              : { date: { startDate, endDate, timezone } },
            bucket
          )
    }
) AS session_stats
FULL JOIN
(
    SELECT
         toDateTime(${
           TimeBucketToFn[bucket]
         }(toTimeZone(timestamp, '${timezone}'))) AS time,
        COUNT(*) AS pageviews,
        COUNT(DISTINCT user_id) AS users
    FROM events
    WHERE
        site_id = ${site}
        ${filterStatement}
        ${getTimeStatement(
          pastMinutes
            ? { pastMinutes }
            : {
                date: { startDate, endDate, timezone },
              }
        )}
        AND type = 'pageview'
    GROUP BY time ORDER BY time ${
      isAllTime
        ? ""
        : getTimeStatementFill(
            pastMinutes
              ? { pastMinutes }
              : { date: { startDate, endDate, timezone } },
            bucket
          )
    }
) AS page_stats
USING time
ORDER BY time`;

  return query;
};

export async function fetchOverviewBucketed({
  startDate,
  endDate,
  timezone,
  bucket,
  site,
  filters,
  pastMinutes,
}: GetOverviewBucketedRequest["Params"] & GetOverviewBucketedRequest["Querystring"]) {
  const query = getQuery({
    startDate,
    endDate,
    timezone,
    bucket,
    site,
    filters,
    pastMinutes,
  });

  try {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
    });

    return await processResults<GetOverviewBucketedResponse[number]>(result);
  } catch (error) {
    console.error("Error fetching pageviews:", error);
    return null;
  }
}

export async function getOverviewBucketed(
  req: FastifyRequest<GetOverviewBucketedRequest>,
  res: FastifyReply
) {
  const { startDate, endDate, timezone, bucket, filters, pastMinutes } =
    req.query;
  const site = req.params.site;

  const userHasAccessToSite = await getUserHasAccessToSitePublic(req, site);
  if (!userHasAccessToSite) {
    return res.status(403).send({ error: "Forbidden" });
  }

  const data = await fetchOverviewBucketed({
    startDate,
    endDate,
    timezone,
    bucket,
    site,
    filters,
    pastMinutes,
  });
  if (!data) {
    return res.status(500).send({ error: "Failed to fetch pageviews" });
  }

  return res.send({ data });
}
