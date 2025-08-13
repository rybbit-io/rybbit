import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import {
  getFilterStatement,
  getTimeStatement,
  processResults,
} from "./utils.js";
import { getUserHasAccessToSitePublic } from "../../lib/auth-utils.js";
import { FilterParams } from "@rybbit/shared";

export type GetSessionsResponse = {
  session_id: string;
  user_id: string;
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
}[];

export interface GetSessionsRequest {
  Params: {
    site: string;
  };
  Querystring: FilterParams<{
    page: number;
    userId?: string;
  }>;
}

export async function getSessions(
  req: FastifyRequest<GetSessionsRequest>,
  res: FastifyReply
) {
  const { filters, page, userId } = req.query;
  const site = req.params.site;
  const userHasAccessToSite = await getUserHasAccessToSitePublic(req, site);
  if (!userHasAccessToSite) {
    return res.status(403).send({ error: "Forbidden" });
  }

  const filterStatement = getFilterStatement(filters);
  const timeStatement = getTimeStatement(req.query);

  const query = `
  WITH AggregatedSessions AS (
      SELECT
          session_id,
          user_id,
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
          /* UTM parameters from url_parameters map */
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
          countIf(type = 'outbound') AS outbound
      FROM events
      WHERE
          site_id = {siteId:Int32}
          ${userId ? ` AND user_id = {userId:String}` : ""}
          ${timeStatement}
      GROUP BY
          session_id,
          user_id
  )
  SELECT *
  FROM AggregatedSessions
  WHERE 1 = 1 ${filterStatement}
  ORDER BY session_end DESC
  LIMIT {limit:Int32} OFFSET {offset:Int32}
  `;

  try {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteId: Number(site),
        userId,
        limit: 100,
        offset: (page - 1) * 100,
      },
    });

    const data = await processResults<GetSessionsResponse[number]>(result);
    return res.send({ data });
  } catch (error) {
    console.error("Generated Query:", query);
    console.error("Error fetching sessions:", error);
    return res.status(500).send({ error: "Failed to fetch sessions" });
  }
}
