import { FastifyReply, FastifyRequest } from "fastify";
import { sql, SQL } from "drizzle-orm";
import { db } from "../../../db/postgres/postgres.js";
import { enrichWithTraits } from "../utils/utils.js";
import { getTimeStatement } from "../utils/timeWindow.js";
import { FilterParams } from "@rybbit/shared";
import { getFilterStatement } from "../utils/getFilterStatement.js";
import { SESSION_CHANNEL_AGG, SESSION_REFERRER_AGG } from "../utils/sessionAttribution.js";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";
import { effectiveUserId } from "../utils/effectiveUserId.js";

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

export const buildUsersQuery = (
  query: GetUsersRequest["Querystring"],
  siteId: number,
  matchingUserIds: string[] | null,
  isCountQuery: boolean = false
) => {
  const {
    filters,
    sort_by: sortBy = "last_seen",
    sort_order: sortOrder = "desc",
    identified_only: identifiedOnly = "false",
  } = query;
  // Search results force the identified-only view: matching user IDs come from
  // Postgres profiles, which only exist for identified users.
  const filterIdentified = identifiedOnly === "true" || matchingUserIds !== null;

  // Validate sort parameters
  const validSortFields = ["first_seen", "last_seen", "pageviews", "sessions", "events"];
  const actualSortBy = validSortFields.includes(sortBy) ? sortBy : "last_seen";
  const actualSortOrder = sortOrder === "asc" ? "ASC" : "DESC";

  // Generate filter statement and time statement
  const timeStatement = getTimeStatement(query);
  // Applied against raw events (same placement as the count queries): the
  // aggregate doesn't project every filterable column (pathname, querystring,
  // utm_*, …), and event-level placement keeps the returned rows consistent
  // with totalCount.
  const filterStatement = getFilterStatement(filters, siteId, timeStatement);

  // Query to get total count
  if (isCountQuery) {
    return filterIdentified
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
    count(DISTINCT ${effectiveUserId("events")}) AS total_count
FROM events
WHERE
    site_id = {siteId:Int32}
    ${filterStatement}
    ${timeStatement}
    ${matchingUserIds ? "AND events.identified_user_id IN ({matchingUserIds:Array(String)})" : ""}
  `;
  }

  // Filters must run in a subquery below the aggregation: the aggregate SELECT
  // aliases argMax(...) to the same names as the raw columns (country, browser,
  // …), and ClickHouse resolves unqualified WHERE references at that level to
  // the aliases, throwing ILLEGAL_AGGREGATION.
  return `
WITH AggregatedUsers AS (
    SELECT
        -- Group by effective user: identified_user_id for identified users, user_id (device) for anonymous
        ${effectiveUserId("events")} AS effective_user_id,
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
        ${SESSION_REFERRER_AGG} AS referrer,
        ${SESSION_CHANNEL_AGG} AS channel,
        argMin(hostname, timestamp) AS hostname,
        countIf(type = 'pageview') AS pageviews,
        countIf(type = 'custom_event') AS events,
        count(distinct session_id) AS sessions,
        max(timestamp) AS last_seen,
        min(timestamp) AS first_seen,
        argMax(tag, timestamp) AS tag
    FROM (
        SELECT *
        FROM events
        WHERE
            site_id = {siteId:Int32}
            ${timeStatement}
            ${filterStatement}
            ${matchingUserIds ? "AND events.identified_user_id IN ({matchingUserIds:Array(String)})" : ""}
    ) AS events
    GROUP BY
        effective_user_id
)
SELECT
    *
FROM AggregatedUsers
WHERE 1 = 1
${filterIdentified ? "AND identified_user_id != ''" : ""}
ORDER BY ${actualSortBy} ${actualSortOrder}
LIMIT {limit:Int32} OFFSET {offset:Int32}
  `;
};

export const getUsers = analyticsRoute<GetUsersRequest>(
  "users",
  async (req: FastifyRequest<GetUsersRequest>, res: FastifyReply) => {
    const { page = "1", page_size: pageSize = "100", search, search_field: searchField = "username" } = req.query;
    const site = req.params.siteId;

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
    }

    const pageNum = parseInt(page, 10);
    const pageSizeNum = parseInt(pageSize, 10);
    const offset = (pageNum - 1) * pageSizeNum;

    // Execute both queries in parallel
    const [data, countData] = await Promise.all([
      runAnalyticsQuery<Omit<GetUsersResponse[number], "traits">>({
        query: buildUsersQuery(req.query, Number(site), matchingUserIds, false),
        params: {
          siteId: Number(site),
          limit: pageSizeNum,
          offset,
          ...(matchingUserIds ? { matchingUserIds } : {}),
        },
      }),
      runAnalyticsQuery<{ total_count: number }>({
        query: buildUsersQuery(req.query, Number(site), matchingUserIds, true),
        params: {
          siteId: Number(site),
          ...(matchingUserIds ? { matchingUserIds } : {}),
        },
      }),
    ]);

    const totalCount = countData[0]?.total_count || 0;

    // Enrich with traits from Postgres
    const dataWithTraits = await enrichWithTraits(data, Number(site));

    return res.send({
      data: dataWithTraits,
      totalCount,
      page: pageNum,
      pageSize: pageSizeNum,
    });
  }
);
