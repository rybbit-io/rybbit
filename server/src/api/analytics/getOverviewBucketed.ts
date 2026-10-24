import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { resolveTimeWindow } from "./utils/timeWindow.js";
import { TimeBucket } from "./types.js";
import { analyticsRoute, runAnalyticsQuery } from "./utils/analyticsQuery.js";
import { effectiveUserId } from "./utils/effectiveUserId.js";
import { buildFilteredSessionsCTE } from "./utils/sessionFilters.js";

export const buildOverviewBucketedQuery = (params: FilterParams<{ bucket: TimeBucket }>, siteId: number) => {
  const { bucket = "hour", filters } = params;

  const window = resolveTimeWindow(params);
  const timeStatement = window.where();
  const filteredSessionsCTE = buildFilteredSessionsCTE(filters, siteId, timeStatement);
  const sessionJoin = filteredSessionsCTE ? "INNER JOIN FilteredSessions USING (session_id)" : "";
  const fillClause = window.fill(bucket);

  return `
WITH
${filteredSessionsCTE ? `${filteredSessionsCTE},` : ""}
SessionsWithStats AS (
    SELECT
        session_id,
        MIN(timestamp) AS start_time,
        MAX(timestamp) AS end_time,
        countIf(type = 'pageview') AS total_pageviews_in_session
    FROM events
    ${sessionJoin}
    WHERE
        site_id = {siteId:Int32}
        ${timeStatement}
    GROUP BY session_id
)
SELECT
    -- A bucket can exist on one side only (with no fill, a day that a session
    -- crossed into but none started on is page-side only). Without nullable
    -- join results the missing side's key reads as 1970-01-01, so take
    -- whichever side has the bucket and zero the other side's metrics.
    coalesce(session_stats.time, page_stats.time) AS time,
    coalesce(session_stats.sessions, 0) AS sessions,
    coalesce(session_stats.pages_per_session, 0) AS pages_per_session,
    coalesce(session_stats.bounce_rate, 0) * 100 AS bounce_rate,
    coalesce(session_stats.session_duration, 0) AS session_duration,
    coalesce(page_stats.pageviews, 0) AS pageviews,
    coalesce(page_stats.users, 0) AS users
FROM
(
    SELECT
         ${window.bucketed("start_time", bucket)} AS time,
        COUNT() AS sessions,
        AVG(total_pageviews_in_session) AS pages_per_session,
        sumIf(1, total_pageviews_in_session = 1) / COUNT() AS bounce_rate,
        AVG(end_time - start_time) AS session_duration
    FROM SessionsWithStats
    GROUP BY time ORDER BY time ${fillClause}
) AS session_stats
FULL JOIN
(
    SELECT
        ${window.bucketed("timestamp", bucket)} AS time,
        countIf(type = 'pageview') AS pageviews,
        COUNT(DISTINCT ${effectiveUserId()}) AS users
    FROM events
    ${sessionJoin}
    WHERE
        site_id = {siteId:Int32}
        ${timeStatement}
    GROUP BY time ORDER BY time ${fillClause}
) AS page_stats
ON session_stats.time = page_stats.time
ORDER BY time
SETTINGS join_use_nulls = 1`;
};

type getOverviewBucketed = { time: string; pageviews: number }[];

interface GetOverviewBucketedRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    bucket: TimeBucket;
  }>;
}

export const getOverviewBucketed = analyticsRoute<GetOverviewBucketedRequest>(
  "pageviews",
  async (req: FastifyRequest<GetOverviewBucketedRequest>, res: FastifyReply) => {
    const {
      start_date,
      end_date,
      time_zone,
      bucket,
      filters,
      start_datetime,
      end_datetime,
      past_minutes_start,
      past_minutes_end,
    } = req.query;
    const site = req.params.siteId;

    const data = await runAnalyticsQuery<getOverviewBucketed[number]>({
      query: buildOverviewBucketedQuery(
        {
          start_date,
          end_date,
          time_zone,
          bucket,
          filters,
          start_datetime,
          end_datetime,
          past_minutes_start,
          past_minutes_end,
        },
        Number(site)
      ),
      params: { siteId: Number(site) },
    });

    return res.send({ data });
  }
);
