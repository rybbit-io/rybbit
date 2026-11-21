import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";
import { effectiveUserId } from "../utils/effectiveUserId.js";
import { buildFilteredSessionsCTE } from "../utils/sessionFilters.js";
import { getTimeStatement } from "../utils/timeWindow.js";
import { buildSeenBeforeSubquery, NEW_USER_LOOKBACK_DAYS } from "./userScope.js";

export interface GetUsersSummaryRequest {
  Params: { siteId: string };
  Querystring: FilterParams;
}

export interface UsersSummary {
  users: number;
  identified_users: number;
  /** Sum of every user's session count, so it divides into sessions per user. */
  sessions: number;
  identified_sessions: number;
  /** Null for an all-time request: there is no earlier period to have been seen in. */
  new_users: number | null;
  returning_users: number | null;
  /** How far back "new" looks, in days. */
  lookback_days: number;
  /** Users with at least `power_min_sessions` sessions in the period. */
  power_users: number;
  power_min_sessions: number;
}

/** How many users had this many sessions, split by identified and new. */
export interface SessionHistogramRow {
  sessions: number;
  identified: number;
  is_new: number;
  users: number;
}

/**
 * Far more rows than a real site produces: `k` distinct session counts need at
 * least k(k+1)/2 sessions between them. The handler refuses a result that
 * reaches the limit rather than summing a truncated one.
 */
export const HISTOGRAM_ROW_LIMIT = 100_000;

/** Share of users a "power user" has to match or beat on sessions. */
const POWER_USER_QUANTILE = 0.95;
/** One session is a visit, not a habit, however the distribution falls. */
const POWER_USER_FLOOR = 2;

/**
 * The period's users as a histogram of sessions per user. Every stat-band
 * figure is a sum over it, so one pass over the period answers all of them.
 * Binds `{siteId:Int32}`.
 */
export function buildUsersSummaryQuery(query: FilterParams, siteId: number): string {
  const timeStatement = getTimeStatement(query);
  const filteredSessionsCTE = buildFilteredSessionsCTE(query.filters, siteId, timeStatement);
  const seenBefore = buildSeenBeforeSubquery(query);

  return `
WITH ${filteredSessionsCTE ? `${filteredSessionsCTE},` : ""}
UserStats AS (
    SELECT
        ${effectiveUserId("events")} AS effective_user_id,
        argMax(events.identified_user_id, events.timestamp) != '' AS identified,
        count(DISTINCT events.session_id) AS sessions
    FROM events
    ${filteredSessionsCTE ? "INNER JOIN FilteredSessions USING (session_id)" : ""}
    WHERE
        site_id = {siteId:Int32}
        ${timeStatement}
    GROUP BY effective_user_id
)
SELECT
    sessions,
    identified,
    ${seenBefore ? `effective_user_id NOT IN ${seenBefore}` : "1"} AS is_new,
    count() AS users
FROM UserStats
GROUP BY sessions, identified, is_new
ORDER BY sessions ASC
LIMIT ${HISTOGRAM_ROW_LIMIT}
  `;
}

/**
 * The smallest session count that at least `POWER_USER_QUANTILE` of users are
 * at or below, floored at two sessions.
 */
export function powerUserThreshold(rows: SessionHistogramRow[]): number {
  const total = rows.reduce((sum, row) => sum + row.users, 0);
  const sorted = [...rows].sort((a, b) => a.sessions - b.sessions);

  let seen = 0;
  for (const row of sorted) {
    seen += row.users;
    if (seen >= total * POWER_USER_QUANTILE) {
      return Math.max(POWER_USER_FLOOR, row.sessions);
    }
  }
  return POWER_USER_FLOOR;
}

export function summarizeUsers(rows: SessionHistogramRow[], hasLookback: boolean): UsersSummary {
  const sum = (pick: (row: SessionHistogramRow) => number) => rows.reduce((total, row) => total + pick(row), 0);

  const users = sum(row => row.users);
  const newUsers = sum(row => (row.is_new ? row.users : 0));
  const powerMinSessions = powerUserThreshold(rows);

  return {
    users,
    identified_users: sum(row => (row.identified ? row.users : 0)),
    sessions: sum(row => row.sessions * row.users),
    identified_sessions: sum(row => (row.identified ? row.sessions * row.users : 0)),
    new_users: hasLookback ? newUsers : null,
    returning_users: hasLookback ? users - newUsers : null,
    lookback_days: NEW_USER_LOOKBACK_DAYS,
    power_users: sum(row => (row.sessions >= powerMinSessions ? row.users : 0)),
    power_min_sessions: powerMinSessions,
  };
}

export const getUsersSummary = analyticsRoute<GetUsersSummaryRequest>(
  "users summary",
  async (req: FastifyRequest<GetUsersSummaryRequest>, res: FastifyReply) => {
    const siteId = Number(req.params.siteId);

    const rows = await runAnalyticsQuery<SessionHistogramRow>({
      query: buildUsersSummaryQuery(req.query, siteId),
      params: { siteId },
    });

    if (rows.length >= HISTOGRAM_ROW_LIMIT) {
      throw new Error("Users summary histogram exceeded its row limit");
    }

    return res.send({ data: summarizeUsers(rows, buildSeenBeforeSubquery(req.query) !== null) });
  }
);
