import { FilterParams } from "@rybbit/shared";
import { count, desc, eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import SqlString from "sqlstring";
import { db } from "../../../db/postgres/postgres.js";
import { goals } from "../../../db/postgres/schema.js";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";
import { buildFilteredSessionsCTE } from "../utils/sessionFilters.js";
import { getTimeStatement } from "../utils/timeWindow.js";
import { buildGoalsConversionsQuery, buildGoalsTotalSessionsQuery } from "./getGoals.js";
import { buildGoalCondition } from "./goalConditions.js";

type SiteGoal = typeof goals.$inferSelect;

/**
 * The most goals one summary computes. Each goal is one conditional
 * aggregate, so the bound is on ClickHouse work per request; a site with more
 * gets its most recently created ones and `total_goals` says how many exist.
 */
export const MAX_SUMMARY_GOALS = 200;

/**
 * Goals per conversions query. The paginated list (`GET /goals`) already
 * allows this many in one query.
 */
export const GOALS_PER_QUERY = 100;

export interface GoalSummaryRow {
  goalId: number;
  name: string | null;
  goalType: string;
  config: SiteGoal["config"];
  createdAt: string | null;
  total_conversions: number;
  total_sessions: number;
  conversion_rate: number;
}

export interface GoalsSummary {
  /** Every computed goal, most conversions first. */
  goals: GoalSummaryRow[];
  /** Sessions in the window: the denominator of every rate. */
  total_sessions: number;
  /** Sessions that completed at least one of `goals`. */
  converting_sessions: number;
  /** Goals the site has. Larger than `goals.length` when the bound was hit. */
  total_goals: number;
}

interface GetGoalsSummaryRequest {
  Params: { siteId: string };
  Querystring: FilterParams<{}>;
}

export const chunkGoals = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

/**
 * Sessions that completed any of the goals. Not the sum of the per-goal
 * counts: a session that completes two goals is one converting session.
 * Returns null when none of the goals produces a valid condition.
 */
export const buildConvertingSessionsQuery = (
  query: GetGoalsSummaryRequest["Querystring"],
  siteId: number,
  siteGoals: Pick<SiteGoal, "goalType" | "config">[]
): string | null => {
  const conditions = siteGoals.map(goal => buildGoalCondition(goal)).filter((c): c is string => !!c);
  if (conditions.length === 0) return null;

  const timeStatement = getTimeStatement(query);
  const filteredSessionsCTE = buildFilteredSessionsCTE(query.filters, siteId, timeStatement);

  return `
      ${filteredSessionsCTE ? `WITH ${filteredSessionsCTE}` : ""}
      SELECT COUNT(DISTINCT session_id) AS converting_sessions
      FROM events
      ${filteredSessionsCTE ? "INNER JOIN FilteredSessions USING (session_id)" : ""}
      WHERE site_id = ${SqlString.escape(siteId)}
        AND (${conditions.map(condition => `(${condition})`).join(" OR ")})
        ${timeStatement}
    `;
};

/**
 * Ranks after computing, across every goal: most conversions first. The rate
 * shares one denominator, so this is also the rate order. Ties keep the newest
 * goal first, then the higher id, so the order is stable between requests.
 */
export const rankGoals = (rows: GoalSummaryRow[]): GoalSummaryRow[] =>
  [...rows].sort(
    (a, b) =>
      b.total_conversions - a.total_conversions ||
      (b.createdAt ?? "").localeCompare(a.createdAt ?? "") ||
      b.goalId - a.goalId
  );

export const getGoalsSummary = analyticsRoute<GetGoalsSummaryRequest>(
  "goals summary",
  async (request: FastifyRequest<GetGoalsSummaryRequest>, reply: FastifyReply) => {
    const siteId = Number(request.params.siteId);

    const [totalGoalsResult, siteGoals] = await Promise.all([
      db.select({ count: count() }).from(goals).where(eq(goals.siteId, siteId)),
      db
        .select()
        .from(goals)
        .where(eq(goals.siteId, siteId))
        .orderBy(desc(goals.createdAt), desc(goals.goalId))
        .limit(MAX_SUMMARY_GOALS),
    ]);
    const totalGoals = totalGoalsResult[0]?.count || 0;

    if (siteGoals.length === 0) {
      const empty: GoalsSummary = { goals: [], total_sessions: 0, converting_sessions: 0, total_goals: totalGoals };
      return reply.send({ data: empty });
    }

    const convertingQuery = buildConvertingSessionsQuery(request.query, siteId, siteGoals);
    const conversionQueries = chunkGoals(siteGoals, GOALS_PER_QUERY)
      .map(chunk => buildGoalsConversionsQuery(request.query, siteId, chunk))
      .filter((query): query is string => query !== null);

    const [totalSessionsData, convertingData, ...conversionData] = await Promise.all([
      runAnalyticsQuery<{ total_sessions: number }>({
        query: buildGoalsTotalSessionsQuery(request.query, siteId),
      }),
      convertingQuery
        ? runAnalyticsQuery<{ converting_sessions: number }>({ query: convertingQuery })
        : Promise.resolve([]),
      ...conversionQueries.map(query => runAnalyticsQuery<Record<string, number>>({ query })),
    ]);

    const totalSessions = Number(totalSessionsData[0]?.total_sessions) || 0;
    const conversions: Record<string, number> = Object.assign({}, ...conversionData.map(rows => rows[0] ?? {}));

    const rows: GoalSummaryRow[] = siteGoals.map(goal => {
      const totalConversions = Number(conversions[`goal_${goal.goalId}_conversions`]) || 0;
      return {
        goalId: goal.goalId,
        name: goal.name,
        goalType: goal.goalType,
        config: goal.config,
        createdAt: goal.createdAt,
        total_conversions: totalConversions,
        total_sessions: totalSessions,
        conversion_rate: totalSessions > 0 ? totalConversions / totalSessions : 0,
      };
    });

    const summary: GoalsSummary = {
      goals: rankGoals(rows),
      total_sessions: totalSessions,
      converting_sessions: Number(convertingData[0]?.converting_sessions) || 0,
      total_goals: totalGoals,
    };

    return reply.send({ data: summary });
  }
);
