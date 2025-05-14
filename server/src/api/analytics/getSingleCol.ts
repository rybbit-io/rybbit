import { FastifyReply, FastifyRequest } from "fastify";
import clickhouse from "../../db/clickhouse/clickhouse.js";
import { getUserHasAccessToSitePublic } from "../../lib/auth-utils.js";
import { FilterParameter } from "./types.js";
import {
  getFilterStatement,
  getSqlParam,
  getTimeStatement,
  processResults,
} from "./utils.js";

interface GenericRequest {
  Params: {
    site: string;
  };
  Querystring: {
    startDate: string;
    endDate: string;
    minutes: number;
    timezone: string;
    filters: string;
    parameter: FilterParameter;
    limit?: number;
  };
}

type GetSingleColResponse = {
  value: string;
  // count means sessions where this page was the entry/exit
  count: number;
  percentage: number;

  pageviews?: number; // pageviews of this specific page when it was an entry/exit
  pageviews_percentage?: number;
  time_on_page_seconds?: number; // avg time on this page when it was an entry/exit
}[];

const getQuery = (request: FastifyRequest<GenericRequest>) => {
  const { startDate, endDate, timezone, filters, parameter, limit, minutes } =
    request.query;

  const filterStatement = getFilterStatement(filters);
  const timeStatement = getTimeStatement(
    minutes
      ? { pastMinutes: Number(minutes) }
      : {
          date: { startDate, endDate, timezone },
        }
  );

  // Validate and sanitize the limit parameter
  let validatedLimit: number | null = null;
  if (limit !== undefined) {
    const parsedLimit = parseInt(String(limit), 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      validatedLimit = parsedLimit;
    }
  }
  const limitStatement = validatedLimit
    ? `LIMIT ${validatedLimit}`
    : "LIMIT 100"; // Default limit

  const percentageStatement = `ROUND(
          COUNT(distinct(session_id)) * 100.0 / SUM(COUNT(distinct(session_id))) OVER (),
          2
      ) as percentage`;

  if (parameter === "event_name") {
    return `
    SELECT
      event_name as value,
      COUNT(*) as count,
      ${percentageStatement}
    FROM events
    WHERE
      site_id = {siteId:Int32}
      AND event_name IS NOT NULL 
      AND event_name <> ''
      ${filterStatement}
      ${timeStatement}
      AND type = 'custom_event'
    GROUP BY event_name ORDER BY count desc
    ${limitStatement};
  `;
  }

  if (parameter === "exit_page" || parameter === "entry_page") {
    const isEntry = parameter === "entry_page";
    const orderDirection = isEntry ? "ASC" : "DESC";
    const rowNumFilter = isEntry ? "row_num = 1" : "row_num = 1"; // Need argMax logic instead if last row needed reliably

    // For exit page, row_number() might not be the most robust if events aren't perfectly ordered.
    // argMax(timestamp) per session might be better but makes getting the time_diff harder.
    // Sticking with row_number for now, assuming reasonable ordering.

    return `
    WITH RelevantEvents AS (
        -- Select all pageview events matching filters and time range
        SELECT *
        FROM events
        WHERE
            site_id = {siteId:Int32}
            AND type = 'pageview'
            ${filterStatement}
            ${timeStatement}
    ),
    EventTimes AS (
        -- Calculate next timestamp within each session for duration calculation
        SELECT
            session_id,
            pathname,
            timestamp,
            leadInFrame(timestamp) OVER (PARTITION BY session_id ORDER BY timestamp ROWS BETWEEN CURRENT ROW AND 1 FOLLOWING) as next_timestamp,
            -- Assign row number to identify first/last event per session
            row_number() OVER (PARTITION BY session_id ORDER BY timestamp ${orderDirection}) as row_num
        FROM RelevantEvents
    ),
    PageDurations AS (
        -- Calculate duration for each pageview and keep row number
        SELECT
            session_id,
            pathname,
            timestamp,
            next_timestamp,
            row_num,
            if(isNull(next_timestamp), 0, dateDiff('second', timestamp, next_timestamp)) as time_diff_seconds
        FROM EventTimes
    ),
    FilteredDurations AS (
        -- Filter durations to only include the entry or exit event
        SELECT *
        FROM PageDurations
        WHERE ${rowNumFilter}
    ),
    PathStats AS (
        -- Aggregate stats for the filtered entry/exit pages
        SELECT
            pathname,
            -- Count distinct sessions where this path was entry/exit
            count(DISTINCT session_id) as unique_sessions,
            -- Count pageviews for this path when it was entry/exit (should be same as unique_sessions here)
            count() as visits,
            -- Calculate average time spent on this page when it was the entry/exit page
            avg(if(time_diff_seconds < 0, 0, if(time_diff_seconds > 1800, 1800, time_diff_seconds))) as avg_time_on_page_seconds
        FROM FilteredDurations
        WHERE pathname IS NOT NULL AND pathname <> ''
        GROUP BY pathname
    )
    -- Final selection with percentages
    SELECT
        pathname as value,
        unique_sessions as count,
        round((unique_sessions / sum(unique_sessions) OVER ()) * 100, 2) as percentage,
        visits as pageviews,
        round((visits / sum(visits) OVER ()) * 100, 2) as pageviews_percentage,
        avg_time_on_page_seconds as time_on_page_seconds
    FROM PathStats
    ORDER BY unique_sessions DESC
    ${limitStatement};`;
  }

  if (parameter === "pathname") {
    return `
    WITH EventTimes AS (
        SELECT
            session_id,
            pathname,
            timestamp,
            leadInFrame(timestamp) OVER (PARTITION BY session_id ORDER BY timestamp ROWS BETWEEN CURRENT ROW AND 1 FOLLOWING) as next_timestamp
        FROM events
        WHERE 
          site_id = {siteId:Int32}
          AND type = 'pageview'
          ${filterStatement}
          ${timeStatement}
    ),
    PageDurations AS (
        SELECT
            session_id,
            pathname,
            timestamp,
            next_timestamp,
            if(isNull(next_timestamp), 0, dateDiff('second', timestamp, next_timestamp)) as time_diff_seconds
        FROM EventTimes
    ),
    PathStats AS (
        SELECT
            pathname,
            count() as visits,
            count(DISTINCT session_id) as unique_sessions,
            avg(if(time_diff_seconds < 0, 0, if(time_diff_seconds > 1800, 1800, time_diff_seconds))) as avg_time_on_page_seconds
        FROM PageDurations
        GROUP BY pathname
    )
    SELECT
        pathname as value,
        unique_sessions as count,
        round((unique_sessions / sum(unique_sessions) OVER ()) * 100, 2) as percentage,
        visits as pageviews,
        round((visits / sum(visits) OVER ()) * 100, 2) as pageviews_percentage,
        avg_time_on_page_seconds as time_on_page_seconds
    FROM PathStats
    ORDER BY unique_sessions DESC
    ${limitStatement};
    `;
  }

  return `
    WITH PageStats AS (
      SELECT
        ${getSqlParam(parameter)} as value,
        COUNT(distinct(session_id)) as unique_sessions,
        COUNT() as pageviews
      FROM events
      WHERE
          site_id = {siteId:Int32}
          AND ${getSqlParam(parameter)} IS NOT NULL
          AND ${getSqlParam(parameter)} <> ''
          ${filterStatement}
          ${timeStatement}
          // AND type = 'pageview'
      GROUP BY value
    )
    SELECT
      value,
      unique_sessions as count,
      round((unique_sessions / sum(unique_sessions) OVER ()) * 100, 2) as percentage,
      pageviews,
      round((pageviews / sum(pageviews) OVER ()) * 100, 2) as pageviews_percentage
    FROM PageStats
    ORDER BY count desc
    ${limitStatement};
  `;
};

export async function getSingleCol(
  req: FastifyRequest<GenericRequest>,
  res: FastifyReply
) {
  const { parameter } = req.query;
  const site = req.params.site;

  const userHasAccessToSite = await getUserHasAccessToSitePublic(req, site);
  if (!userHasAccessToSite) {
    return res.status(403).send({ error: "Forbidden" });
  }

  const query = getQuery(req);

  try {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteId: Number(site),
      },
    });

    const data = await processResults<GetSingleColResponse[number]>(result);
    return res.send({ data });
  } catch (error) {
    console.error(`Error fetching ${parameter}:`, error);
    // Add query to error log for easier debugging
    console.error("Failed query:", query);
    return res.status(500).send({ error: `Failed to fetch ${parameter}` });
  }
}
