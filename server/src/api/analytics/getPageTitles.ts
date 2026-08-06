import { FastifyReply, FastifyRequest } from "fastify";
import { getTimeStatement } from "./utils/utils.js";
import { FilterParams } from "@rybbit/shared";
import { getFilterStatement } from "./utils/getFilterStatement.js";
import { analyticsRoute, getPaginationStatements, runAnalyticsQuery, runPaginatedQuery } from "./utils/analyticsQuery.js";

interface GetPageTitlesRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    limit?: number;
    page?: number;
  }>;
}

// This type represents a single item in the array
export type PageTitleItem = {
  value: string;
  pathname: string;
  count: number;
  percentage: number;
  pageviews?: number;
  bounce_rate?: number;
  time_on_page_seconds?: number;
};

// Structure for paginated response (if/when fully paginated)
type PageTitlesPaginatedResponse = {
  data: PageTitleItem[];
  totalCount: number;
};

export const buildPageTitlesQuery = (
  query: GetPageTitlesRequest["Querystring"],
  siteId: number,
  isCountQuery: boolean = false
) => {
  const { filters } = query;

  const timeStatement = getTimeStatement(query);
  const filterStatement = getFilterStatement(filters, siteId, timeStatement);

  // StandardSection usually shows a small number, e.g., 7 or 10. Default to 10 for non-paginated use.
  const { limitStatement, offsetStatement } = getPaginationStatements(query, 10, isCountQuery);

  // For page_title, we want to count distinct sessions that viewed this title.
  // We also need a representative pathname and calculate average time on page.
  // Using argMax to get the pathname from the most recent event for that title in a session.
  const baseCteQuery = `
    SessionPageCounts AS (
        SELECT
            session_id,
            COUNT() as pageviews_in_session
        FROM events
        WHERE
            site_id = {siteId:Int32}
            AND type = 'pageview'
            ${timeStatement}
        GROUP BY session_id
    ),
    EventTimes AS (
        SELECT
            session_id,
            page_title,
            pathname,
            timestamp,
            leadInFrame(timestamp) OVER (PARTITION BY session_id ORDER BY timestamp ROWS BETWEEN CURRENT ROW AND 1 FOLLOWING) as next_timestamp
        FROM events
        WHERE
          site_id = {siteId:Int32}
          AND page_title IS NOT NULL
          AND page_title <> ''
          AND type = 'pageview'
          ${filterStatement}
          ${timeStatement}
    ),
    PageDurations AS (
        SELECT
            e.session_id as session_id,
            e.page_title as page_title,
            e.pathname as pathname,
            e.timestamp as timestamp,
            e.next_timestamp as next_timestamp,
            if(isNull(e.next_timestamp), 0, dateDiff('second', e.timestamp, e.next_timestamp)) as time_diff_seconds,
            spc.pageviews_in_session as pageviews_in_session
        FROM EventTimes e
        LEFT JOIN SessionPageCounts spc ON e.session_id = spc.session_id
    ),
    PageTitleStats AS (
        SELECT
            page_title as value,
            argMax(pathname, timestamp) as pathname,
            count(DISTINCT session_id) as unique_sessions,
            count() as pageviews,
            countIf(DISTINCT session_id, pageviews_in_session = 1) as bounced_sessions,
            avg(if(time_diff_seconds < 0, 0, if(time_diff_seconds > 1800, 1800, time_diff_seconds))) as avg_time_on_page_seconds
        FROM PageDurations
        GROUP BY page_title
    )
  `;

  if (isCountQuery) {
    return `
    WITH ${baseCteQuery}
    SELECT COUNT(*) as totalCount FROM PageTitleStats;
    `;
  }

  return `
    WITH ${baseCteQuery}
    SELECT
        value,
        pathname,
        unique_sessions as count,
        ROUND(
            unique_sessions * 100.0 / SUM(unique_sessions) OVER (),
            2
        ) as percentage,
        pageviews,
        ROUND(
            bounced_sessions * 100.0 / nullIf(unique_sessions, 0),
            2
        ) as bounce_rate,
        avg_time_on_page_seconds as time_on_page_seconds
    FROM PageTitleStats
    ORDER BY count DESC
    ${limitStatement}
    ${offsetStatement}
  `;
};

export const getPageTitles = analyticsRoute<GetPageTitlesRequest>(
  "page titles",
  async (req: FastifyRequest<GetPageTitlesRequest>, res: FastifyReply) => {
    const siteId = Number(req.params.siteId);
    const params = { siteId };
    const dataSpec = { query: buildPageTitlesQuery(req.query, siteId, false), params };

    if (req.query.page !== undefined) {
      const result = await runPaginatedQuery<PageTitleItem>(dataSpec, {
        query: buildPageTitlesQuery(req.query, siteId, true),
        params,
      });
      return res.send({ data: result });
    }

    // For non-paginated (StandardSection default) use, return the simpler structure
    const items = await runAnalyticsQuery<PageTitleItem>(dataSpec);
    return res.send({ data: items });
  }
);
