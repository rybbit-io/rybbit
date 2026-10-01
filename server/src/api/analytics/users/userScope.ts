import { FilterParams } from "@rybbit/shared";
import { and, eq, inArray, sql, SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../db/postgres/postgres.js";
import { userProfiles } from "../../../db/postgres/schema.js";
import { runAnalyticsQuery } from "../utils/analyticsQuery.js";
import { effectiveUserId } from "../utils/effectiveUserId.js";
import { buildFilteredSessionsCTE } from "../utils/sessionFilters.js";
import { getTimeStatement, parseDateTimeMs, resolveTimeWindow, TimeWindowParams } from "../utils/timeWindow.js";

/**
 * Which users the Users page is looking at, beyond the shared period and
 * filters: the quick filters (identified, new, a minimum session count), the
 * search box, and one group of a trait breakdown.
 *
 * The list, its count, the trait breakdown and the rows inside each trait
 * group all narrow through this module, so a group's count and the rows that
 * open under it cannot disagree.
 */

/**
 * A user is new in a period when nothing was seen from them in this many days
 * before it. The window is fixed because the true definition (never seen
 * before) would scan a site's whole history on every page load; 90 days is the
 * retention report's default horizon.
 */
export const NEW_USER_LOOKBACK_DAYS = 90;

/**
 * Ceiling on the identified ids handed to ClickHouse as a query parameter.
 * Parameters travel in the request URL, which ClickHouse caps at 1 MiB.
 */
export const MAX_SCOPED_USER_IDS = 10_000;

const flag = z.enum(["true", "false"]).optional();

/** The Users page's own query params, on top of the shared time and filter params. */
export const userNarrowingSchema = z.object({
  identified_only: flag,
  new_only: flag,
  min_sessions: z.coerce.number().int().min(1).max(1_000_000).optional(),
  search: z.string().max(200).optional(),
  search_field: z.string().max(50).optional(),
  trait_key: z.string().min(1).max(200).optional(),
  trait_value: z.string().max(2000).optional(),
  trait_missing: flag,
});

export type UserNarrowingParams = {
  identified_only?: string;
  new_only?: string;
  min_sessions?: string | number;
  search?: string;
  search_field?: string;
  trait_key?: string;
  trait_value?: string;
  trait_missing?: string;
};

export type UsersQuerystring = FilterParams<UserNarrowingParams>;

/** Identified ids resolved in Postgres that the ClickHouse query is limited to, or leaves out. */
export interface UserScope {
  matchingUserIds?: string[] | null;
  excludedUserIds?: string[] | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const shiftDate = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

const toDateTimeParam = (ms: number) => new Date(ms).toISOString().slice(0, 19).replace("T", " ");

/**
 * The window of `days` that ends where the requested one begins, in the same
 * form the request used. Null for an all-time request, which has no "before".
 *
 * Mirrors the precedence of `resolveTimeWindow`: a date range, then a datetime
 * range, then past minutes.
 */
export function getLookbackParams(params: TimeWindowParams, days = NEW_USER_LOOKBACK_DAYS): TimeWindowParams | null {
  const { time_zone } = params;
  const usable = (candidate: TimeWindowParams) => !resolveTimeWindow(candidate).isAllTime;
  let lookback: TimeWindowParams | null = null;

  if (
    params.start_date &&
    params.end_date &&
    usable({ start_date: params.start_date, end_date: params.end_date, time_zone })
  ) {
    // Both bounds are whole days in the site's timezone: the day before the
    // period starts is the last day of the lookback.
    lookback = {
      start_date: shiftDate(params.start_date, -days),
      end_date: shiftDate(params.start_date, -1),
      time_zone,
    };
  } else if (
    params.start_datetime &&
    params.end_datetime &&
    usable({ start_datetime: params.start_datetime, end_datetime: params.end_datetime, time_zone })
  ) {
    const start = parseDateTimeMs(params.start_datetime);
    lookback = {
      start_datetime: toDateTimeParam(start - days * DAY_MS),
      end_datetime: toDateTimeParam(start),
      time_zone,
    };
  } else if (params.past_minutes_start !== undefined && params.past_minutes_end !== undefined && usable(params)) {
    const start = Number(params.past_minutes_start);
    lookback = { past_minutes_start: start + days * 24 * 60, past_minutes_end: start, time_zone };
  }

  // Never hand back a window that would resolve to all time: the caller scans it.
  return lookback && usable(lookback) ? lookback : null;
}

const EVENT_USER = effectiveUserId("events");

/**
 * Whether one-row-per-user aggregates (`effective_user_id`) were also seen in
 * the lookback before the period. The inner `IN` keeps the lookback scan's
 * result to people who are in the period at all.
 *
 * Null when the request is all time.
 */
export function buildSeenBeforeSubquery(query: TimeWindowParams): string | null {
  const lookback = getLookbackParams(query);
  if (!lookback) return null;

  return `(
      SELECT ${EVENT_USER}
      FROM events
      WHERE site_id = {siteId:Int32}
        ${getTimeStatement(lookback)}
        AND ${EVENT_USER} IN (
          SELECT ${EVENT_USER}
          FROM events
          WHERE site_id = {siteId:Int32}
            ${getTimeStatement(query)}
        )
    )`;
}

export interface UserNarrowing {
  /** Predicates on raw `events` rows, each already prefixed with `AND`. */
  eventConditions: string;
  /**
   * Predicates on one-row-per-user aggregates exposing `effective_user_id`,
   * `identified_user_id` and `sessions`, each already prefixed with `AND`.
   */
  userConditions: string;
  /** True when `userConditions` needs more than the identified flag, so a count has to aggregate per user. */
  needsUserAggregate: boolean;
  /** Bound parameters the fragments refer to. */
  params: Record<string, unknown>;
}

const isUserIdSearch = (query: UserNarrowingParams) => !!query.search?.trim() && query.search_field === "user_id";

/**
 * Compiles the Users page's narrowing into SQL fragments. Every value is a
 * bound parameter; nothing from the request is interpolated.
 */
export function buildUserNarrowing(query: UsersQuerystring, scope: UserScope = {}): UserNarrowing {
  const eventConditions: string[] = [];
  const userConditions: string[] = [];
  const params: Record<string, unknown> = {};
  let needsUserAggregate = false;

  if (scope.matchingUserIds) {
    eventConditions.push("AND events.identified_user_id IN ({matchingUserIds:Array(String)})");
    params.matchingUserIds = scope.matchingUserIds;
  }
  if (scope.excludedUserIds?.length) {
    eventConditions.push("AND events.identified_user_id NOT IN ({excludedUserIds:Array(String)})");
    params.excludedUserIds = scope.excludedUserIds;
  }
  if (isUserIdSearch(query)) {
    // The id a user is listed and linked by: the custom id when identified, the
    // device id otherwise. Searched here because anonymous users have no profile
    // in Postgres to search.
    eventConditions.push(`AND positionCaseInsensitiveUTF8(${EVENT_USER}, {userIdSearch:String}) > 0`);
    params.userIdSearch = query.search!.trim();
  }

  // Ids resolved in Postgres are identified by construction.
  if (query.identified_only === "true" || scope.matchingUserIds) {
    userConditions.push("AND identified_user_id != ''");
  }
  if (query.min_sessions !== undefined && query.min_sessions !== "") {
    userConditions.push("AND sessions >= {minSessions:UInt32}");
    params.minSessions = Number(query.min_sessions);
    needsUserAggregate = true;
  }
  if (query.new_only === "true") {
    const seenBefore = buildSeenBeforeSubquery(query);
    // All time has no "before": everyone in it is new.
    if (seenBefore) {
      userConditions.push(`AND effective_user_id NOT IN ${seenBefore}`);
      needsUserAggregate = true;
    }
  }

  return {
    eventConditions: eventConditions.join("\n            "),
    userConditions: userConditions.join("\n"),
    needsUserAggregate,
    params,
  };
}

const SEARCHABLE_TRAITS = ["username", "name", "email"] as const;

/**
 * Resolves a name, username or email search to the identified ids whose
 * profile matches. Those fields are traits, which live in Postgres and only
 * exist for identified users. A user-id search is not resolved here: it runs
 * in ClickHouse and covers anonymous users too (see `buildUserNarrowing`).
 *
 * `limited` reports that more profiles matched than can be passed to
 * ClickHouse, so the caller can say the result is partial instead of
 * presenting it as complete.
 */
export async function resolveSearchScope(
  query: UserNarrowingParams,
  siteId: number
): Promise<{ matchingUserIds: string[] | null; limited: boolean }> {
  const term = query.search?.trim();
  if (!term || isUserIdSearch(query)) {
    return { matchingUserIds: null, limited: false };
  }

  const field = SEARCHABLE_TRAITS.find(candidate => candidate === query.search_field) ?? "username";
  const pattern = `%${term}%`;
  const conditions: Record<(typeof SEARCHABLE_TRAITS)[number], SQL> = {
    username: sql`traits->>'username' ILIKE ${pattern}`,
    name: sql`traits->>'name' ILIKE ${pattern}`,
    email: sql`traits->>'email' ILIKE ${pattern}`,
  };

  // Most recently updated first, so a capped result keeps the profiles most
  // likely to be active in the period.
  const rows = await db.execute<{ user_id: string }>(sql`
    SELECT user_id FROM user_profiles
    WHERE site_id = ${siteId} AND ${conditions[field]}
    ORDER BY updated_at DESC
    LIMIT ${MAX_SCOPED_USER_IDS + 1}
  `);

  const ids = rows.map(row => row.user_id);
  return { matchingUserIds: ids.slice(0, MAX_SCOPED_USER_IDS), limited: ids.length > MAX_SCOPED_USER_IDS };
}

/** One identified user's activity in the period, or every anonymous user's summed (`identified_user_id` is ''). */
export interface CohortRow {
  identified_user_id: string;
  users: number;
  sessions: number;
  pageviews: number;
  events: number;
}

/**
 * Activity in the period, one row per identified user plus one row for all
 * anonymous users together. Binds `{siteId:Int32}` and `{cohortLimit:Int32}`.
 *
 * The anonymous row sorts first so the limit can only ever cut identified
 * users, which is how the caller tells that there were too many.
 */
export function buildCohortQuery(query: UsersQuerystring, siteId: number, narrowing: UserNarrowing): string {
  const timeStatement = getTimeStatement(query);
  const filteredSessionsCTE = buildFilteredSessionsCTE(query.filters, siteId, timeStatement);

  return `
WITH ${filteredSessionsCTE ? `${filteredSessionsCTE},` : ""}
UserStats AS (
    SELECT
        ${EVENT_USER} AS effective_user_id,
        argMax(identified_user_id, timestamp) AS identified_user_id,
        count(DISTINCT session_id) AS sessions,
        countIf(type = 'pageview') AS pageviews,
        countIf(type = 'custom_event') AS custom_events
    FROM (
        SELECT *
        FROM events
        ${filteredSessionsCTE ? "INNER JOIN FilteredSessions USING (session_id)" : ""}
        WHERE
            site_id = {siteId:Int32}
            ${timeStatement}
            ${narrowing.eventConditions}
    ) AS events
    GROUP BY effective_user_id
)
SELECT
    identified_user_id,
    count() AS users,
    sum(sessions) AS sessions,
    sum(pageviews) AS pageviews,
    sum(custom_events) AS events
FROM (
    -- Filtered a level down: the sums above reuse the column names the conditions read.
    SELECT *
    FROM UserStats
    WHERE 1 = 1
    ${narrowing.userConditions}
)
GROUP BY identified_user_id
ORDER BY identified_user_id = '' DESC, identified_user_id ASC
LIMIT {cohortLimit:Int32}
  `;
}

export type TraitCohort =
  | { limited: true }
  | {
      limited: false;
      /** The anonymous row, when there is one, and one row per identified user. */
      rows: CohortRow[];
      /** The trait's value for each identified user in the period that has one. */
      values: Map<string, string>;
    };

const PROFILE_CHUNK = 5000;

/**
 * Joins the two stores for one trait: who was active in the period comes from
 * ClickHouse, what each of those people's trait says comes from Postgres.
 *
 * ClickHouse goes first because the people active in a period are far fewer
 * than a site's profiles. Past `MAX_SCOPED_USER_IDS` identified users the join
 * is refused (`limited`) rather than answered from a sample.
 */
export async function resolveTraitCohort(
  query: UsersQuerystring,
  siteId: number,
  traitKey: string,
  scope: UserScope
): Promise<TraitCohort> {
  const narrowing = buildUserNarrowing(query, scope);
  const rows = await runAnalyticsQuery<CohortRow>({
    query: buildCohortQuery(query, siteId, narrowing),
    // One more than the ceiling shows it was passed; one more again for the anonymous row.
    params: { siteId, cohortLimit: MAX_SCOPED_USER_IDS + 2, ...narrowing.params },
  });

  const identifiedIds = rows.filter(row => row.identified_user_id !== "").map(row => row.identified_user_id);
  if (identifiedIds.length > MAX_SCOPED_USER_IDS) {
    return { limited: true };
  }

  const values = new Map<string, string>();
  for (let start = 0; start < identifiedIds.length; start += PROFILE_CHUNK) {
    const profiles = await db
      .select({
        userId: userProfiles.userId,
        value: sql<string | null>`${userProfiles.traits}->>${traitKey}`,
      })
      .from(userProfiles)
      .where(
        and(
          eq(userProfiles.siteId, siteId),
          inArray(userProfiles.userId, identifiedIds.slice(start, start + PROFILE_CHUNK)),
          // A key that is absent and a key set to null both mean the user has no value.
          sql`${userProfiles.traits}->>${traitKey} IS NOT NULL`
        )
      );
    for (const profile of profiles) {
      if (profile.value !== null) values.set(profile.userId, profile.value);
    }
  }

  return { limited: false, rows, values };
}
