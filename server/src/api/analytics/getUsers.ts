import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getFilterStatement, getTimeStatement, processResults } from "./utils.js";
import { FilterParams } from "@rybbit/shared";

export type GetUsersResponse = {
  user_id: string;
  country: string;
  region: string;
  city: string;
  language: string;
  browser: string;
  operating_system: string;
  device_type: string;
  pageviews: number;
  events: number;
  sessions: number;
  hostname: string;
  last_seen: string;
  first_seen: string;
}[];

export interface GetUsersRequest {
  Params: {
    site: string;
  };
  Querystring: FilterParams<{
    page?: string;
    pageSize?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export async function getUsers(req: FastifyRequest<GetUsersRequest>, res: FastifyReply) {
  const {
    startDate,
    endDate,
    timeZone,
    filters,
    page = "1",
    pageSize = "20",
    sortBy = "last_seen",
    sortOrder = "desc",
    pastMinutesStart,
    pastMinutesEnd,
  } = req.query;
  const site = req.params.site;

  const pageNum = parseInt(page, 10);
  const pageSizeNum = parseInt(pageSize, 10);
  const offset = (pageNum - 1) * pageSizeNum;

  // Validate sort parameters
  const validSortFields = ["first_seen", "last_seen", "pageviews", "sessions", "events"];
  const actualSortBy = validSortFields.includes(sortBy) ? sortBy : "last_seen";
  const actualSortOrder = sortOrder === "asc" ? "ASC" : "DESC";

  // Generate filter statement and time statement
  const filterStatement = getFilterStatement(filters);
  const timeStatement = getTimeStatement(req.query);

  const query = `
WITH AggregatedUsers AS (
    SELECT
        user_id,
        argMax(country, timestamp) AS country,
        argMax(region, timestamp) AS region,
        argMax(city, timestamp) AS city,
        argMax(language, timestamp) AS language,
        argMax(browser, timestamp) AS browser,
        argMax(operating_system, timestamp) AS operating_system,
        argMax(device_type, timestamp) AS device_type,
        argMax(screen_width, timestamp) AS screen_width, 
        argMax(screen_height, timestamp) AS screen_height,
        argMin(referrer, timestamp) AS referrer,
        argMax(channel, timestamp) AS channel,
        argMin(hostname, timestamp) AS hostname,
        countIf(type = 'pageview') AS pageviews,
        countIf(type = 'custom_event') AS events,
        count(distinct session_id) AS sessions,
        max(timestamp) AS last_seen,
        min(timestamp) AS first_seen
    FROM events
    WHERE
        site_id = {siteId:Int32}
        ${timeStatement}
    GROUP BY
        user_id
)
SELECT *
FROM AggregatedUsers
WHERE 1 = 1 ${filterStatement}
ORDER BY ${actualSortBy} ${actualSortOrder}
LIMIT {limit:Int32} OFFSET {offset:Int32}
  `;

  // Query to get total count
  const countQuery = `
SELECT
    count(DISTINCT user_id) AS total_count
FROM events
WHERE
    site_id = {siteId:Int32}
    ${filterStatement}
    ${timeStatement}
  `;

  try {
    // Execute both queries in parallel
    const [result, countResult] = await Promise.all([
      clickhouse.query({
        query,
        format: "JSONEachRow",
        query_params: {
          siteId: Number(site),
          limit: pageSizeNum,
          offset,
        },
      }),
      clickhouse.query({
        query: countQuery,
        format: "JSONEachRow",
        query_params: {
          siteId: Number(site),
        },
      }),
    ]);

    const data = await processResults<GetUsersResponse[number]>(result);
    const countData = await processResults<{ total_count: number }>(countResult);
    const totalCount = countData[0]?.total_count || 0;

    return res.send({
      data,
      totalCount,
      page: pageNum,
      pageSize: pageSizeNum,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).send({ error: "Failed to fetch users" });
  }
}
