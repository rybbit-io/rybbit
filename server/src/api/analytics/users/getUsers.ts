import { FastifyReply, FastifyRequest } from "fastify";
import { enrichWithTraits } from "../utils/utils.js";
import { getTimeStatement } from "../utils/timeWindow.js";
import { FilterParams } from "@rybbit/shared";
import { SESSION_CHANNEL_AGG, SESSION_REFERRER_AGG } from "../utils/sessionAttribution.js";
import { buildFilteredSessionsCTE } from "../utils/sessionFilters.js";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";
import { effectiveUserId } from "../utils/effectiveUserId.js";
import {
  buildUserNarrowing,
  resolveSearchScope,
  resolveTraitCohort,
  UserNarrowingParams,
  userNarrowingSchema,
  UserScope,
} from "./userScope.js";

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
  Querystring: FilterParams<
    UserNarrowingParams & {
      page?: string;
      page_size?: string;
      sort_by?: string;
      sort_order?: string;
    }
  >;
}

export const buildUsersQuery = (
  query: GetUsersRequest["Querystring"],
  siteId: number,
  scope: UserScope | null,
  isCountQuery: boolean = false
) => {
  const { filters, sort_by: sortBy = "last_seen", sort_order: sortOrder = "desc" } = query;
  const narrowing = buildUserNarrowing(query, scope ?? {});
  // Ids resolved in Postgres (a profile search, a trait group) force the
  // identified-only view: profiles only exist for identified users.
  const filterIdentified = query.identified_only === "true" || !!scope?.matchingUserIds;

  // Validate sort parameters
  const validSortFields = ["first_seen", "last_seen", "pageviews", "sessions", "events"];
  const actualSortBy = validSortFields.includes(sortBy) ? sortBy : "last_seen";
  const actualSortOrder = sortOrder === "asc" ? "ASC" : "DESC";

  // Dimension filters qualify sessions. User aggregates then consume every
  // event in those sessions, so an acquisition value on the landing event does
  // not discard later pageviews or custom events from the same session.
  const timeStatement = getTimeStatement(query);
  const filteredSessionsCTE = buildFilteredSessionsCTE(filters, siteId, timeStatement);
  const filteredSessionsJoin = filteredSessionsCTE ? "INNER JOIN FilteredSessions USING (session_id)" : "";
  const withFilteredSessions = filteredSessionsCTE ? `WITH ${filteredSessionsCTE}` : "";

  // Query to get total count
  if (isCountQuery) {
    // A minimum session count or "new" is a property of the user, not of any
    // one event, so the count has to build the per-user rows it filters.
    if (narrowing.needsUserAggregate) {
      return `
${withFilteredSessions}
SELECT count() AS total_count
FROM (
    SELECT
        ${effectiveUserId("events")} AS effective_user_id,
        argMax(identified_user_id, timestamp) AS identified_user_id,
        count(DISTINCT session_id) AS sessions
    FROM (
        SELECT *
        FROM events
        ${filteredSessionsJoin}
        WHERE
            site_id = {siteId:Int32}
            ${timeStatement}
            ${narrowing.eventConditions}
    ) AS events
    GROUP BY effective_user_id
)
WHERE 1 = 1
${narrowing.userConditions}
`;
    }

    return filterIdentified
      ? `
${withFilteredSessions}
SELECT count(*) AS total_count
FROM (
    SELECT DISTINCT identified_user_id
    FROM events
    ${filteredSessionsJoin}
    WHERE
        site_id = {siteId:Int32}
        AND identified_user_id != ''
        ${timeStatement}
        ${narrowing.eventConditions}
)
`
      : `
${withFilteredSessions}
SELECT
    count(DISTINCT ${effectiveUserId("events")}) AS total_count
FROM events
${filteredSessionsJoin}
WHERE
    site_id = {siteId:Int32}
    ${timeStatement}
    ${narrowing.eventConditions}
  `;
  }

  return `
WITH ${filteredSessionsCTE ? `${filteredSessionsCTE},` : ""}
AggregatedUsers AS (
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
        ${filteredSessionsJoin}
        WHERE
            site_id = {siteId:Int32}
            ${timeStatement}
            ${narrowing.eventConditions}
    ) AS events
    GROUP BY
        effective_user_id
)
SELECT
    *
FROM AggregatedUsers
WHERE 1 = 1
${narrowing.userConditions}
ORDER BY ${actualSortBy} ${actualSortOrder}, effective_user_id ASC
LIMIT {limit:Int32} OFFSET {offset:Int32}
  `;
};

export const getUsers = analyticsRoute<GetUsersRequest>(
  "users",
  async (req: FastifyRequest<GetUsersRequest>, res: FastifyReply) => {
    const parsed = userNarrowingSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid query parameters" });
    }

    const { page = "1", page_size: pageSize = "100" } = req.query;
    const { trait_key: traitKey, trait_value: traitValue, trait_missing: traitMissing } = parsed.data;
    const siteId = Number(req.params.siteId);
    const pageNum = parseInt(page, 10);
    const pageSizeNum = parseInt(pageSize, 10);

    if (traitKey && traitValue === undefined && traitMissing !== "true") {
      return res.status(400).send({ error: "trait_key needs trait_value or trait_missing=true" });
    }

    const empty = (flags: { searchLimited?: boolean; breakdownLimited?: boolean } = {}) =>
      res.send({ data: [], totalCount: 0, page: pageNum, pageSize: pageSizeNum, ...flags });

    // A name, username or email search resolves to identified ids in Postgres.
    const search = await resolveSearchScope(req.query, siteId);
    if (search.matchingUserIds?.length === 0) {
      return empty();
    }
    let scope: UserScope = { matchingUserIds: search.matchingUserIds };

    // One group of a trait breakdown: the people in the period whose trait has
    // this value, or who have no value for it.
    if (traitKey) {
      const cohort = await resolveTraitCohort(req.query, siteId, traitKey, scope);
      if (cohort.limited) {
        return empty({ searchLimited: search.limited, breakdownLimited: true });
      }
      if (traitMissing === "true" && scope.matchingUserIds) {
        // Already limited to the searched ids: drop the ones with a value
        // rather than sending a second list.
        const ids = scope.matchingUserIds.filter(userId => !cohort.values.has(userId));
        if (ids.length === 0) {
          return empty({ searchLimited: search.limited });
        }
        scope = { matchingUserIds: ids };
      } else if (traitMissing === "true") {
        scope = { excludedUserIds: [...cohort.values.keys()] };
      } else {
        const ids = [...cohort.values].filter(([, value]) => value === traitValue).map(([userId]) => userId);
        if (ids.length === 0) {
          return empty({ searchLimited: search.limited });
        }
        scope = { matchingUserIds: ids };
      }
    }

    const { params: narrowingParams } = buildUserNarrowing(req.query, scope);
    const offset = (pageNum - 1) * pageSizeNum;

    // Execute both queries in parallel
    const [data, countData] = await Promise.all([
      runAnalyticsQuery<Omit<GetUsersResponse[number], "traits">>({
        query: buildUsersQuery(req.query, siteId, scope, false),
        params: {
          siteId,
          limit: pageSizeNum,
          offset,
          ...narrowingParams,
        },
      }),
      runAnalyticsQuery<{ total_count: number }>({
        query: buildUsersQuery(req.query, siteId, scope, true),
        params: {
          siteId,
          ...narrowingParams,
        },
      }),
    ]);

    const totalCount = countData[0]?.total_count || 0;

    // Enrich with traits from Postgres
    const dataWithTraits = await enrichWithTraits(data, siteId);

    return res.send({
      data: dataWithTraits,
      totalCount,
      page: pageNum,
      pageSize: pageSizeNum,
      // True when more profiles matched the search than can be looked up at once.
      searchLimited: search.limited,
    });
  }
);
