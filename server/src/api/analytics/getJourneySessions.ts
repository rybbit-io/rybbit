import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  buildJourneyFragments,
  JourneyOptions,
  JourneyQuerySpec,
  JourneyQuerystring,
  MAX_JOURNEY_STEPS,
  parseJourneyOptions,
} from "./journeyPaths.js";
import { GetSessionsResponse } from "./sessions/getSessions.js";
import { analyticsRoute, runAnalyticsQuery } from "./utils/analyticsQuery.js";
import {
  SESSION_CHANNEL_AGG,
  SESSION_REFERRER_AGG,
  SESSION_UTM_CAMPAIGN_AGG,
  SESSION_UTM_CONTENT_AGG,
  SESSION_UTM_MEDIUM_AGG,
  SESSION_UTM_SOURCE_AGG,
  SESSION_UTM_TERM_AGG,
} from "./utils/sessionAttribution.js";
import { getTimeStatement } from "./utils/timeWindow.js";
import { enrichWithTraits } from "./utils/utils.js";

const MAX_PAGE_SIZE = 100;

// The journey whose sessions are wanted: the pages exactly as a journeys row
// lists them.
const journeyPathSchema = z.array(z.string().max(2048)).min(1).max(MAX_JOURNEY_STEPS);

interface GetJourneySessionsRequest {
  Params: { siteId: string };
  Querystring: FilterParams<
    JourneyQuerystring & {
      path: string;
      replays_only?: string;
      limit?: string;
      page?: string;
    }
  >;
}

interface JourneySessionsOptions {
  path: string[];
  replaysOnly: boolean;
  limit: number;
  page: number;
}

/**
 * The sessions counted in one journeys row. The journey is derived exactly as
 * the journeys endpoint derives it (same filters, steps, end page and page
 * grouping), so the list is the row's sessions and no others.
 */
export const buildJourneySessionsQuery = (
  query: GetJourneySessionsRequest["Querystring"],
  siteId: number,
  options: JourneyOptions,
  { path, replaysOnly, limit, page }: JourneySessionsOptions
): JourneyQuerySpec => {
  const { ctes, params } = buildJourneyFragments(query, siteId, options);
  const timeStatement = getTimeStatement(query);

  return {
    query: `
    WITH ${ctes},
    TargetSessions AS (
      SELECT session_id
      FROM session_journeys
      WHERE journey = {journeyPath:Array(String)}
    ),
    AggregatedSessions AS (
      SELECT
          session_id,
          argMax(user_id, timestamp) AS user_id,
          argMax(identified_user_id, timestamp) AS identified_user_id,
          argMax(country, timestamp) AS country,
          argMax(region, timestamp) AS region,
          argMax(city, timestamp) AS city,
          argMax(language, timestamp) AS language,
          argMax(device_type, timestamp) AS device_type,
          argMax(browser, timestamp) AS browser,
          argMax(browser_version, timestamp) AS browser_version,
          argMax(operating_system, timestamp) AS operating_system,
          argMax(operating_system_version, timestamp) AS operating_system_version,
          argMax(screen_width, timestamp) AS screen_width,
          argMax(screen_height, timestamp) AS screen_height,
          ${SESSION_REFERRER_AGG} AS referrer,
          ${SESSION_CHANNEL_AGG} AS channel,
          argMin(hostname, timestamp) AS hostname,
          ${SESSION_UTM_SOURCE_AGG} AS utm_source,
          ${SESSION_UTM_MEDIUM_AGG} AS utm_medium,
          ${SESSION_UTM_CAMPAIGN_AGG} AS utm_campaign,
          ${SESSION_UTM_TERM_AGG} AS utm_term,
          ${SESSION_UTM_CONTENT_AGG} AS utm_content,
          MAX(timestamp) AS session_end,
          MIN(timestamp) AS session_start,
          dateDiff('second', MIN(timestamp), MAX(timestamp)) AS session_duration,
          argMinIf(pathname, timestamp_ms, type = 'pageview') AS entry_page,
          argMaxIf(pathname, timestamp_ms, type = 'pageview') AS exit_page,
          countIf(type = 'pageview') AS pageviews,
          countIf(type = 'custom_event') AS events,
          countIf(type = 'error') AS errors,
          countIf(type = 'outbound') AS outbound,
          countIf(type = 'button_click') AS button_clicks,
          countIf(type = 'copy') AS copies,
          countIf(type = 'form_submit') AS form_submits,
          countIf(type = 'input_change') AS input_changes,
          argMax(ip, timestamp) AS ip,
          argMax(lat, timestamp) AS lat,
          argMax(lon, timestamp) AS lon,
          argMax(tag, timestamp) AS tag
      FROM events
      WHERE
          site_id = {siteId:Int32}
          ${timeStatement}
          AND session_id IN (SELECT session_id FROM TargetSessions)
      GROUP BY
          session_id
    ),
    ReplaySessions AS (
      SELECT DISTINCT session_id
      FROM session_replay_metadata_v2
      FINAL
      WHERE site_id = {siteId:Int32}
        AND event_count >= 2
    )
    SELECT
        a.*,
        if(r.session_id != '', 1, 0) AS has_replay
    FROM AggregatedSessions a
    LEFT JOIN ReplaySessions r ON a.session_id = r.session_id
    ${replaysOnly ? "WHERE r.session_id != ''" : ""}
    ORDER BY a.session_end DESC
    LIMIT {limit:Int32} OFFSET {offset:Int32}
    `,
    params: { ...params, journeyPath: path, limit, offset: (page - 1) * limit },
  };
};

export const getJourneySessions = analyticsRoute<GetJourneySessionsRequest>(
  "journey sessions",
  async (request: FastifyRequest<GetJourneySessionsRequest>, reply: FastifyReply) => {
    const siteId = parseInt(request.params.siteId, 10);

    // The sessions are picked by their path alone; a goal only adds a count.
    const parsed = parseJourneyOptions({ ...request.query, goalId: undefined });
    if (!parsed.ok) {
      return reply.status(400).send({ error: parsed.error });
    }

    let path: string[];
    try {
      path = journeyPathSchema.parse(JSON.parse(request.query.path));
    } catch {
      return reply.status(400).send({ error: "Path must be a JSON array of 1 to 10 pages" });
    }

    const limit = parseInt(request.query.limit ?? "25", 10);
    const page = parseInt(request.query.page ?? "1", 10);
    if (isNaN(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
      return reply.status(400).send({ error: `Limit parameter must be a number between 1 and ${MAX_PAGE_SIZE}` });
    }
    if (isNaN(page) || page < 1) {
      return reply.status(400).send({ error: "Invalid page number" });
    }

    const data = await runAnalyticsQuery<Omit<GetSessionsResponse[number], "traits">>(
      buildJourneySessionsQuery(request.query, siteId, parsed.options, {
        path,
        replaysOnly: request.query.replays_only === "true",
        limit,
        page,
      })
    );

    const dataWithTraits = await enrichWithTraits(data, siteId);
    return reply.send({ data: dataWithTraits });
  }
);
