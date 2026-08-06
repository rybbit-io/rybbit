import { FastifyReply, FastifyRequest } from "fastify";
import { FilterParameter } from "./types.js";
import { getTimeStatement } from "./utils/utils.js";
import { getFilterStatement, getSqlParam } from "./utils/getFilterStatement.js";
import { SESSION_CHANNEL_AGG } from "./utils/sessionAttribution.js";
import { FilterParams } from "@rybbit/shared";
import { analyticsRoute, getPaginationStatements, runPaginatedQuery } from "./utils/analyticsQuery.js";

interface GetMetricRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    parameter: FilterParameter;
    limit?: number;
    page?: number;
  }>;
}

type GetMetricResponse = {
  value: string;
  // title is only used for pathname
  title?: string;
  // hostname from ClickHouse events data
  hostname?: string;
  // count means sessions where this page was the entry/exit
  count: number;
  percentage: number;

  pageviews?: number; // pageviews of this specific page when it was an entry/exit
  pageviews_percentage?: number;
  time_on_page_seconds?: number; // avg time on this page when it was an entry/exit
  bounce_rate?: number; // percentage of sessions that were bounces (single pageview)
}[];

// This type represents a single item in the array returned *within* the data property
type MetricItem = {
  value: string;
  title?: string;
  pathname?: string;
  hostname?: string;
  count: number;
  percentage: number;
  pageviews?: number;
  pageviews_percentage?: number;
  time_on_page_seconds?: number;
  bounce_rate?: number;
};

// This is the structure the API will now send
type GetMetricPaginatedResponse = {
  data: MetricItem[];
  totalCount: number;
};

export const buildMetricQuery = (
  query: GetMetricRequest["Querystring"],
  siteId: number,
  isCountQuery: boolean = false
) => {
  const { filters, parameter } = query;

  const timeStatement = getTimeStatement(query);

  const filterStatement = getFilterStatement(filters, siteId, timeStatement);

  const { limitStatement, offsetStatement } = getPaginationStatements(query, 100, isCountQuery);

  if (parameter === "event_name") {
    if (isCountQuery) {
      return `
      SELECT COUNT(DISTINCT event_name) as totalCount
      FROM events
      WHERE
        site_id = {siteId:Int32}
        AND event_name IS NOT NULL 
        AND event_name <> ''
        ${filterStatement}
        ${timeStatement}
        AND type = 'custom_event';
      `;
    }
    return `
    SELECT
      event_name as value,
      COUNT(*) as count,
      ROUND(COUNT(distinct(session_id)) * 100.0 / SUM(COUNT(distinct(session_id))) OVER (), 2) as percentage
    FROM events
    WHERE
      site_id = {siteId:Int32}
      AND event_name IS NOT NULL 
      AND event_name <> ''
      ${filterStatement}
      ${timeStatement}
      AND type = 'custom_event'
    GROUP BY event_name ORDER BY count desc, event_name asc
    ${limitStatement}
    ${offsetStatement};
  `;
  }

  if (parameter === "page_title") {
    const corePageTitleLogic = `
      SELECT
          page_title as value,
          argMax(pathname, timestamp) as pathname,
          COUNT(DISTINCT session_id) as unique_sessions
      FROM events
      WHERE
          site_id = {siteId:Int32}
          AND page_title IS NOT NULL
          AND page_title <> ''
          -- AND type = 'pageview'
          ${filterStatement}
          ${timeStatement}
      GROUP BY page_title
    `;

    if (isCountQuery) {
      return `SELECT COUNT(*) as totalCount FROM (${corePageTitleLogic});`;
    }

    return `
      WITH SessionPageCounts AS (
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
      TitleStatsWithSessions AS (
          SELECT
              e.page_title as value,
              e.pathname as pathname,
              e.session_id,
              spc.pageviews_in_session
          FROM events e
          LEFT JOIN SessionPageCounts spc ON e.session_id = spc.session_id
          WHERE
              e.site_id = {siteId:Int32}
              AND e.page_title IS NOT NULL
              AND e.page_title <> ''
              ${filterStatement}
              ${timeStatement}
      )
      SELECT
          value,       -- This is page_title
          any(pathname) as pathname,    -- This is the representative pathname
          COUNT(DISTINCT session_id) as count,
          ROUND(
              COUNT(DISTINCT session_id) * 100.0 / SUM(COUNT(DISTINCT session_id)) OVER (),
              2
          ) as percentage,
          ROUND(
              countIf(DISTINCT session_id, pageviews_in_session = 1) * 100.0 / nullIf(COUNT(DISTINCT session_id), 0),
              2
          ) as bounce_rate
      FROM TitleStatsWithSessions
      GROUP BY value
      ORDER BY count DESC, value ASC
      ${limitStatement}
      ${offsetStatement};
    `;
  }

  if (parameter === "exit_page" || parameter === "entry_page") {
    const isEntry = parameter === "entry_page";
    const orderDirection = isEntry ? "ASC" : "DESC";

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
      RelevantEvents AS (
          SELECT
              e.*,
              spc.pageviews_in_session
          FROM events e
          LEFT JOIN SessionPageCounts spc ON e.session_id = spc.session_id
          WHERE
              e.site_id = {siteId:Int32}
              -- AND type = 'pageview'
              ${filterStatement}
              ${timeStatement}
      ),
      EventTimes AS (
          SELECT
              session_id,
              pathname,
              hostname,
              timestamp,
              pageviews_in_session,
              leadInFrame(timestamp) OVER (PARTITION BY session_id ORDER BY timestamp ROWS BETWEEN CURRENT ROW AND 1 FOLLOWING) as next_timestamp,
              row_number() OVER (PARTITION BY session_id ORDER BY timestamp ${orderDirection}) as row_num
          FROM RelevantEvents
      ),
      PageDurations AS (
          SELECT
              session_id,
              pathname,
              hostname,
              timestamp,
              next_timestamp,
              row_num,
              pageviews_in_session,
              if(isNull(next_timestamp), 0, dateDiff('second', timestamp, next_timestamp)) as time_diff_seconds
          FROM EventTimes
      ),
      FilteredDurations AS (
          SELECT *
          FROM PageDurations
          WHERE row_num = 1
      ),
      PathStats AS (
          SELECT
              pathname,
              anyHeavy(hostname) as top_hostname,
              count(DISTINCT session_id) as unique_sessions,
              count() as visits,
              avg(if(time_diff_seconds < 0, 0, if(time_diff_seconds > 1800, 1800, time_diff_seconds))) as avg_time_on_page_seconds,
              countIf(DISTINCT session_id, pageviews_in_session = 1) as bounced_sessions
          FROM FilteredDurations
          WHERE pathname IS NOT NULL AND pathname <> ''
          GROUP BY pathname
      )
    `;

    if (isCountQuery) {
      return `
      WITH ${baseCteQuery}
      SELECT COUNT(DISTINCT pathname) as totalCount FROM PathStats;
      `;
    }

    return `
    WITH ${baseCteQuery}
    SELECT
        pathname as value,
        top_hostname as hostname,
        unique_sessions as count,
        round((unique_sessions / sum(unique_sessions) OVER ()) * 100, 2) as percentage,
        visits as pageviews,
        round((visits / sum(visits) OVER ()) * 100, 2) as pageviews_percentage,
        avg_time_on_page_seconds as time_on_page_seconds,
        round((bounced_sessions / nullIf(unique_sessions, 0)) * 100, 2) as bounce_rate
    FROM PathStats
    ORDER BY unique_sessions DESC, pathname ASC
    ${limitStatement}
    ${offsetStatement};`;
  }

  if (parameter === "pathname") {
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
              e.session_id,
              e.pathname,
              e.hostname,
              e.timestamp,
              spc.pageviews_in_session,
              leadInFrame(e.timestamp) OVER (PARTITION BY e.session_id ORDER BY e.timestamp ROWS BETWEEN CURRENT ROW AND 1 FOLLOWING) as next_timestamp
          FROM events e
          LEFT JOIN SessionPageCounts spc ON e.session_id = spc.session_id
          WHERE
            e.site_id = {siteId:Int32}
            -- AND type = 'pageview'
            ${filterStatement}
            ${timeStatement}
      ),
      PageDurations AS (
          SELECT
              session_id,
              pathname,
              hostname,
              timestamp,
              next_timestamp,
              pageviews_in_session,
              if(isNull(next_timestamp), 0, dateDiff('second', timestamp, next_timestamp)) as time_diff_seconds
          FROM EventTimes
      ),
      PathStats AS (
          SELECT
              pathname,
              anyHeavy(hostname) as top_hostname,
              count() as visits,
              count(DISTINCT session_id) as unique_sessions,
              avg(if(time_diff_seconds < 0, 0, if(time_diff_seconds > 1800, 1800, time_diff_seconds))) as avg_time_on_page_seconds,
              countIf(DISTINCT session_id, pageviews_in_session = 1) as bounced_sessions
          FROM PageDurations
          GROUP BY pathname
      )
    `;
    if (isCountQuery) {
      return `
      WITH ${baseCteQuery}
      SELECT COUNT(DISTINCT pathname) as totalCount FROM PathStats;
      `;
    }
    return `
    WITH ${baseCteQuery}
    SELECT
        pathname as value,
        top_hostname as hostname,
        unique_sessions as count,
        round((unique_sessions / sum(unique_sessions) OVER ()) * 100, 2) as percentage,
        visits as pageviews,
        round((visits / sum(visits) OVER ()) * 100, 2) as pageviews_percentage,
        avg_time_on_page_seconds as time_on_page_seconds,
        round((bounced_sessions / nullIf(unique_sessions, 0)) * 100, 2) as bounce_rate
    FROM PathStats
    ORDER BY unique_sessions DESC, pathname ASC
    ${limitStatement}
    ${offsetStatement};
    `;
  }

  // Default case for other parameters
  const sqlParam = getSqlParam(parameter);

  // Sessions are attributed to their first attributed channel (matching the
  // sessions views), not the first event's channel, which is often 'Direct'.
  const valueExpression = parameter === "channel" ? SESSION_CHANNEL_AGG : `argMin(${sqlParam}, e.timestamp)`;

  if (isCountQuery) {
    return `
    SELECT COUNT(DISTINCT value) as totalCount
    FROM (
        SELECT
            ${valueExpression} as value
        FROM events e
        WHERE
            e.site_id = {siteId:Int32}
            AND ${sqlParam} IS NOT NULL
            AND ${sqlParam} <> ''
            ${filterStatement}
            ${timeStatement}
        GROUP BY e.session_id
    );
    `;
  }

  return `
    WITH SessionPageCounts AS (
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
    SessionData AS (
        SELECT
            ${valueExpression} as value,
            e.session_id,
            any(spc.pageviews_in_session) as pageviews_in_session
        FROM events e
        LEFT JOIN SessionPageCounts spc ON e.session_id = spc.session_id
        WHERE
            e.site_id = {siteId:Int32}
            AND ${sqlParam} IS NOT NULL
            AND ${sqlParam} <> ''
            ${filterStatement}
            ${timeStatement}
        GROUP BY e.session_id
    )
    SELECT
        value,
        COUNT(DISTINCT session_id) as count,
        round((COUNT(DISTINCT session_id) / sum(COUNT(DISTINCT session_id)) OVER ()) * 100, 2) as percentage,
        COUNT() as pageviews,
        round((COUNT() / sum(COUNT()) OVER ()) * 100, 2) as pageviews_percentage,
        round((countIf(DISTINCT session_id, pageviews_in_session = 1) / nullIf(COUNT(DISTINCT session_id), 0)) * 100, 2) as bounce_rate
    FROM SessionData
    GROUP BY value
    ORDER BY count desc, value asc
    ${limitStatement}
    ${offsetStatement};
  `;
};

export const getMetric = analyticsRoute<GetMetricRequest>(
  req => req.query.parameter,
  async (req: FastifyRequest<GetMetricRequest>, res: FastifyReply) => {
    const siteId = Number(req.params.siteId);
    const params = { siteId };

    const result = await runPaginatedQuery<MetricItem>(
      { query: buildMetricQuery(req.query, siteId, false), params },
      { query: buildMetricQuery(req.query, siteId, true), params }
    );

    return res.send({ data: result });
  }
);
