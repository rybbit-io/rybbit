import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { enrichWithTraits, getTimeStatement, processResults } from "../utils/utils.js";
import { FilterParams } from "@rybbit/shared";
import { getFilterStatement } from "../utils/getFilterStatement.js";

export type GetSessionsResponse = {
  session_id: string;
  user_id: string; // Device fingerprint
  identified_user_id: string; // Custom user ID when identified, empty string otherwise
  traits: Record<string, unknown> | null;
  country: string;
  region: string;
  city: string;
  language: string;
  device_type: string;
  browser: string;
  browser_version: string;
  operating_system: string;
  operating_system_version: string;
  screen_width: number;
  screen_height: number;
  referrer: string;
  channel: string;
  hostname: string;
  page_title: string;
  querystring: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  session_end: string;
  session_start: string;
  session_duration: number;
  entry_page: string;
  exit_page: string;
  pageviews: number;
  events: number;
  errors: number;
  outbound: number;
  button_clicks: number;
  copies: number;
  form_submits: number;
  input_changes: number;
  ip: string;
  lat: number;
  lon: number;
  has_replay: number;
}[];

export interface GetSessionsRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    limit: number;
    page: number;
    user_id?: string;
    session_id?: string
    ;
    identified_only?: string;
    min_pageviews?: string;
    min_events?: string;
    min_duration?: string;
  }>;
}

// Field mappings for the CTE which extracts UTM params as separate columns
const SESSION_FIELD_MAPPINGS = {
  "url_parameters['utm_source']": "utm_source",
  "url_parameters['utm_medium']": "utm_medium",
  "url_parameters['utm_campaign']": "utm_campaign",
  "url_parameters['utm_term']": "utm_term",
  "url_parameters['utm_content']": "utm_content",
};

export async function getSessions(req: FastifyRequest<GetSessionsRequest>, res: FastifyReply) {
  const {
    filters,
    page = 1,
    user_id: userId,
    session_id: sessionId,
    limit = 100,
    identified_only: identifiedOnly = "false",
    min_pageviews: minPageviewsStr,
    min_events: minEventsStr,
    min_duration: minDurationStr,
  } = req.query;
  const site = req.params.siteId;
  const filterIdentified = identifiedOnly === "true";
  const minPageviews = minPageviewsStr ? parseInt(minPageviewsStr, 10) : undefined;
  const minEvents = minEventsStr ? parseInt(minEventsStr, 10) : undefined;
  const minDuration = minDurationStr ? parseInt(minDurationStr, 10) : undefined;

  const timeStatement = getTimeStatement(req.query);

  // Use composable filter options:
  // - sessionLevelParams: pathname and page_title filter at session level (finds sessions that visited a page)
  // - fieldMappings: CTE extracts UTM params as separate columns, so we need to map the field names
  const filterStatement = getFilterStatement(filters, Number(site), timeStatement, {
    sessionLevelParams: ["event_name", "pathname", "page_title"],
    fieldMappings: SESSION_FIELD_MAPPINGS,
  });

  const query = `
  WITH AggregatedSessions AS (
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
          argMin(referrer, timestamp) AS referrer,
          argMin(channel, timestamp) AS channel,
          argMin(hostname, timestamp) AS hostname,
          argMin(url_parameters, timestamp)['utm_source'] AS utm_source,
          argMin(url_parameters, timestamp)['utm_medium'] AS utm_medium,
          argMin(url_parameters, timestamp)['utm_campaign'] AS utm_campaign,
          argMin(url_parameters, timestamp)['utm_term'] AS utm_term,
          argMin(url_parameters, timestamp)['utm_content'] AS utm_content,
          MAX(timestamp) AS session_end,
          MIN(timestamp) AS session_start,
          dateDiff('second', MIN(timestamp), MAX(timestamp)) AS session_duration,
          argMinIf(pathname, timestamp, type = 'pageview') AS entry_page,
          argMaxIf(pathname, timestamp, type = 'pageview') AS exit_page,
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
          argMax(lon, timestamp) AS lon
      FROM events
      WHERE
          site_id = {siteId:Int32}
          ${userId ? ` AND (events.user_id = {user_id:String} OR events.identified_user_id = {user_id:String})` : ""}
          ${sessionId ? ` AND events.session_id = {session_id:String}` : ""}
          ${timeStatement}
      GROUP BY
          session_id
      ORDER BY session_end DESC
  ),
  ReplaySessions AS (
      SELECT DISTINCT session_id
      FROM session_replay_metadata
      FINAL
      WHERE site_id = {siteId:Int32}
        AND event_count >= 2
  )
  SELECT
      a.*,
      if(r.session_id != '', 1, 0) AS has_replay
  FROM AggregatedSessions a
  LEFT JOIN ReplaySessions r ON a.session_id = r.session_id
  WHERE 1 = 1 ${filterStatement}
  ${filterIdentified ? "AND a.identified_user_id != ''" : ""}
  ${minPageviews !== undefined ? "AND a.pageviews >= {minPageviews:Int32}" : ""}
  ${minEvents !== undefined ? "AND a.events >= {minEvents:Int32}" : ""}
  ${minDuration !== undefined ? "AND a.session_duration >= {minDuration:Int32}" : ""}
  LIMIT {limit:Int32} OFFSET {offset:Int32}
  `;

  try {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteId: Number(site),
        user_id: userId,
        session_id: sessionId,
        limit: limit || 100,
        offset: (page - 1) * (limit || 100),
        minPageviews: minPageviews ?? 0,
        minEvents: minEvents ?? 0,
        minDuration: minDuration ?? 0,
      },
    });

    const data = await processResults<Omit<GetSessionsResponse[number], "traits">>(result);

    // Enrich with traits from Postgres
    const dataWithTraits = await enrichWithTraits(data, Number(site));

    return res.send({ data: dataWithTraits });
  } catch (error) {
    console.error("Generated Query:", query);
    console.error("Error fetching sessions:", error);
    return res.status(500).send({ error: "Failed to fetch sessions" });
  }
}
