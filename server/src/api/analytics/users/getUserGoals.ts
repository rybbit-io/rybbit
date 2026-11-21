import { FilterParams } from "@rybbit/shared";
import { asc, eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../../../db/postgres/postgres.js";
import { goals } from "../../../db/postgres/schema.js";
import { hasScope, scopeToString } from "../../../lib/scopes.js";
import { buildGoalCondition } from "../goals/goalConditions.js";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";
import { buildUserEventScope } from "./userEventScope.js";

type GoalRow = typeof goals.$inferSelect;

const GOALS_READ = { resource: "goals", action: "read" } as const;

// These routes are guarded by users:read. A scoped bearer credential must also
// hold goals:read, or it could read goal names it cannot list directly.
const lacksGoalsScope = (req: FastifyRequest) =>
  !!req.bearerAuth && !hasScope(req.bearerStatements ?? null, GOALS_READ);
const insufficientScope = (res: FastifyReply) =>
  res.status(403).send({ error: "Insufficient scope", required: scopeToString(GOALS_READ) });

/** A goal the site defines, with the SQL predicate an event must meet to complete it. */
export interface GoalCondition {
  goalId: number;
  condition: string;
}

// One pair of aggregates per goal goes into a single statement, so the number
// of goals a profile evaluates is capped. The goals page allows 100 per page.
export const MAX_USER_GOALS = 100;

// The profile lists 25 sessions a page; the cap leaves room without letting a
// caller hand over an unbounded IN list.
export const MAX_SESSION_IDS = 50;

export interface UserGoal {
  goalId: number;
  name: string | null;
  goalType: string;
  /** Sessions in the window in which this user completed the goal. */
  sessions: number;
  /** The latest completion in the window, UTC. Null when there is none. */
  last_completed: string | null;
}

export interface UserSessionGoals {
  session_id: string;
  goal_ids: number[];
}

export interface GetUserGoalsRequest {
  Params: {
    siteId: string;
    userId: string;
  };
  Querystring: FilterParams;
}

export interface GetUserSessionGoalsRequest {
  Params: {
    siteId: string;
    userId: string;
  };
  Querystring: FilterParams<{ session_ids?: string }>;
}

const loadSiteGoals = (siteId: number): Promise<GoalRow[]> =>
  db.select().from(goals).where(eq(goals.siteId, siteId)).orderBy(asc(goals.goalId)).limit(MAX_USER_GOALS);

// Goals whose configuration yields no predicate (an event goal with no event
// name, say) cannot be completed and are left out of the SQL.
export const toGoalConditions = (siteGoals: Pick<GoalRow, "goalId" | "goalType" | "config">[]): GoalCondition[] =>
  siteGoals.flatMap(goal => {
    const condition = buildGoalCondition(goal);
    return condition ? [{ goalId: goal.goalId, condition }] : [];
  });

/**
 * Per goal: the sessions in which this user completed it, and when they last
 * did, inside the selected window. Conditional aggregation over one scan of the
 * user's events, the same shape the goals page uses for the whole site.
 */
export const buildUserGoalsQuery = (
  query: GetUserGoalsRequest["Querystring"],
  siteId: number,
  conditions: GoalCondition[]
): string | null => {
  if (conditions.length === 0) return null;

  const { withFilteredSessions, scopedEvents } = buildUserEventScope(query, siteId);

  const aggregates = conditions.map(
    ({ goalId, condition }) => `
        COUNT(DISTINCT IF(${condition}, session_id, NULL)) AS goal_${goalId}_sessions,
        maxIf(timestamp, ${condition}) AS goal_${goalId}_last`
  );

  return `
    ${withFilteredSessions}
    SELECT ${aggregates.join(",")}
    FROM ${scopedEvents}
  `;
};

/**
 * Which goals each of the given sessions completed. Bounded three ways: the
 * selected window, the user, and the explicit list of session ids (one page of
 * the profile's session list).
 */
export const buildUserSessionGoalsQuery = (
  query: GetUserSessionGoalsRequest["Querystring"],
  siteId: number,
  conditions: GoalCondition[]
): string | null => {
  if (conditions.length === 0) return null;

  const { withFilteredSessions, scopedEvents } = buildUserEventScope(query, siteId);

  const aggregates = conditions.map(
    ({ goalId, condition }) => `
        countIf(${condition}) AS goal_${goalId}`
  );

  return `
    ${withFilteredSessions}
    SELECT
        session_id,${aggregates.join(",")}
    FROM ${scopedEvents}
    WHERE session_id IN ({sessionIds:Array(String)})
    GROUP BY session_id
  `;
};

const sessionIdsSchema = z.array(z.string().min(1).max(128)).min(1).max(MAX_SESSION_IDS);

/** The `session_ids` query param: a JSON array of 1 to 50 session ids. Null when it is anything else. */
export const parseSessionIds = (raw: unknown): string[] | null => {
  if (typeof raw !== "string") return null;
  try {
    const parsed = sessionIdsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? [...new Set(parsed.data)] : null;
  } catch {
    return null;
  }
};

// maxIf over no matching rows is the epoch, not NULL.
const completedAt = (value: unknown): string | null =>
  typeof value === "string" && !value.startsWith("1970-01-01") ? value : null;

export const getUserGoals = analyticsRoute<GetUserGoalsRequest>(
  "user goals",
  async (req: FastifyRequest<GetUserGoalsRequest>, res: FastifyReply) => {
    if (lacksGoalsScope(req as FastifyRequest)) return insufficientScope(res);

    const siteId = Number(req.params.siteId);
    const siteGoals = await loadSiteGoals(siteId);

    const goalsQuery = buildUserGoalsQuery(req.query, siteId, toGoalConditions(siteGoals));
    const rows = goalsQuery
      ? await runAnalyticsQuery<Record<string, unknown>>({
          query: goalsQuery,
          params: { userId: req.params.userId, site: siteId },
        })
      : [];
    const row = rows[0] ?? {};

    const data: UserGoal[] = siteGoals.map(goal => {
      const sessions = Number(row[`goal_${goal.goalId}_sessions`] ?? 0);
      return {
        goalId: goal.goalId,
        name: goal.name,
        goalType: goal.goalType,
        sessions,
        last_completed: sessions > 0 ? completedAt(row[`goal_${goal.goalId}_last`]) : null,
      };
    });

    return res.send({ data });
  }
);

export const getUserSessionGoals = analyticsRoute<GetUserSessionGoalsRequest>(
  "user session goals",
  async (req: FastifyRequest<GetUserSessionGoalsRequest>, res: FastifyReply) => {
    if (lacksGoalsScope(req as FastifyRequest)) return insufficientScope(res);

    const siteId = Number(req.params.siteId);

    const sessionIds = parseSessionIds(req.query.session_ids);
    if (!sessionIds) {
      return res.status(400).send({ error: `session_ids must be a JSON array of 1 to ${MAX_SESSION_IDS} session ids` });
    }

    const conditions = toGoalConditions(await loadSiteGoals(siteId));
    const sessionGoalsQuery = buildUserSessionGoalsQuery(req.query, siteId, conditions);
    if (!sessionGoalsQuery) {
      return res.send({ data: [] });
    }

    const rows = await runAnalyticsQuery<Record<string, unknown> & { session_id: string }>({
      query: sessionGoalsQuery,
      params: { userId: req.params.userId, site: siteId, sessionIds },
    });

    const data: UserSessionGoals[] = rows.flatMap(row => {
      const goalIds = conditions.filter(({ goalId }) => Number(row[`goal_${goalId}`] ?? 0) > 0).map(c => c.goalId);
      return goalIds.length > 0 ? [{ session_id: row.session_id, goal_ids: goalIds }] : [];
    });

    return res.send({ data });
  }
);
