import { FastifyReply, FastifyRequest } from "fastify";
import { sql, SQL } from "drizzle-orm";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { db } from "../../../db/postgres/postgres.js";
import { enrichWithTraits, getTimeStatement, processResults } from "../utils/utils.js";
import { FilterParams } from "@rybbit/shared";
import { getFilterStatement } from "../utils/getFilterStatement.js";

export type GetUsersResponse = {
  user_id: string; // Device fingerprint
  identified_user_id: string; // Custom user ID when identified, empty string otherwise
  traits: Record<string, unknown> | null;
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
    siteId: string;
  };
  Querystring: FilterParams<{
    page?: string;
    page_size?: string;
    sort_by?: string;
    sort_order?: string;
    identified_only?: string;
    search?: string;
    search_field?: string;
  }>;
}

export async function getUsers(req: FastifyRequest<GetUsersRequest>, res: FastifyReply) {
  const {
    filters,
    page = "1",
    page_size: pageSize = "100",
    sort_by: sortBy = "last_seen",
    sort_order: sortOrder = "desc",
    identified_only: identifiedOnly = "false",
    search,
    search_field: searchField = "username",
  } = req.query;
  const site = req.params.siteId;
  let filterIdentified = identifiedOnly === "true";

  // Search for matching user IDs in Postgres when search is provided
  const MAX_MATCHING_USER_IDS = 10000;
  let matchingUserIds: string[] | null = null;
  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    const siteId = Number(site);

    const fieldConditions: Record<string, SQL> = {
      username: sql`traits->>'username' ILIKE ${searchTerm}`,
      name: sql`traits->>'name' ILIKE ${searchTerm}`,
      email: sql`traits->>'email' ILIKE ${searchTerm}`,
      user_id: sql`user_id ILIKE ${searchTerm}`,
    };
    const condition = fieldConditions[searchField] ?? fieldConditions.username;

    const searchResult = await db.execute<{ user_id: string }>(sql`
      SELECT user_id FROM user_profiles
      WHERE site_id = ${siteId} AND ${condition}
      LIMIT ${MAX_MATCHING_USER_IDS}
    `);

    matchingUserIds = searchResult.map((r) => r.user_id);
    if (matchingUserIds.length === 0) {
      return res.send({
        data: [],
        totalCount: 0,
        page: parseInt(page, 10),
        pageSize: parseInt(pageSize, 10),
      });
    }
    filterIdentified = true;
  }

  const pageNum = parseInt(page, 10);
  const pageSizeNum = parseInt(pageSize, 10);
  const offset = (pageNum - 1) * pageSizeNum;

  // Validate sort parameters
  const validSortFields = ["first_seen", "last_seen", "pageviews", "sessions", "events"];
  const actualSortBy = validSortFields.includes(sortBy) ? sortBy : "last_seen";
  const actualSortOrder = sortOrder === "asc" ? "ASC" : "DESC";

  // Generate filter statement and time statement
  const timeStatement = getTimeStatement(req.query);
  const filterStatement = getFilterStatement(filters, Number(site), timeStatement);

  const query = `
WITH AggregatedUsers AS (
    SELECT
        -- Group by effective user: identified_user_id for identified users, user_id (device) for anonymous
        COALESCE(NULLIF(events.identified_user_id, ''), events.user_id) AS effective_user_id,
        argMax(user_id, timestamp) AS user_id,
        argMax(identified_user_id, timestamp) AS identified_user_id,
        argMax(country, timestamp) AS country,
        argMax(region, timestamp) AS region,
        argMax(city, timestamp) AS city,
        argMax(language, timestamp) AS language,
        argMax(browser, timestamp) AS browser,
        argMax(browser_version, timestamp) AS browser_version,
        argMax(operating_system, timestamp) AS operating_system,
        argMax(operating_system_version, timestamp) AS operating_system_version,
        argMax(device_type, timestamp) AS device_type,
        argMax(screen_width, timestamp) AS screen_width,
        argMax(screen_height, timestamp) AS screen_height,
        argMin(referrer, timestamp) AS referrer,
        argMin(channel, timestamp) AS channel,
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
        ${matchingUserIds ? "AND events.identified_user_id IN ({matchingUserIds:Array(String)})" : ""}
    GROUP BY
        effective_user_id
)
SELECT
    *
FROM AggregatedUsers
WHERE 1 = 1 ${filterStatement}
${filterIdentified ? "AND identified_user_id != ''" : ""}
ORDER BY ${actualSortBy} ${actualSortOrder}
LIMIT {limit:Int32} OFFSET {offset:Int32}
  `;

  // Query to get total count
  const countQuery = filterIdentified
    ? `
SELECT count(*) AS total_count
FROM (
    SELECT DISTINCT identified_user_id
    FROM events
    WHERE
        site_id = {siteId:Int32}
        AND identified_user_id != ''
        ${timeStatement}
        ${filterStatement}
        ${matchingUserIds ? "AND events.identified_user_id IN ({matchingUserIds:Array(String)})" : ""}
)
`
    : `
SELECT
    count(DISTINCT COALESCE(NULLIF(events.identified_user_id, ''), events.user_id)) AS total_count
FROM events
WHERE
    site_id = {siteId:Int32}
    ${filterStatement}
    ${timeStatement}
    ${matchingUserIds ? "AND events.identified_user_id IN ({matchingUserIds:Array(String)})" : ""}
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
          ...(matchingUserIds ? { matchingUserIds } : {}),
        },
      }),
      clickhouse.query({
        query: countQuery,
        format: "JSONEachRow",
        query_params: {
          siteId: Number(site),
          ...(matchingUserIds ? { matchingUserIds } : {}),
        },
      }),
    ]);

    const data = await processResults<Omit<GetUsersResponse[number], "traits">>(result);
    const countData = await processResults<{ total_count: number }>(countResult);
    const totalCount = countData[0]?.total_count || 0;

    // Enrich with traits from Postgres
    const dataWithTraits = await enrichWithTraits(data, Number(site));

    return res.send({
      data: dataWithTraits,
      totalCount,
      page: pageNum,
      pageSize: pageSizeNum,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).send({ error: "Failed to fetch users" });
  }
}
