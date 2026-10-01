import { asc, eq } from "drizzle-orm";
import { db } from "../../../db/postgres/postgres.js";
import { goals } from "../../../db/postgres/schema.js";
import { buildGoalCondition } from "../goals/goalConditions.js";

/** A goal as the session endpoints report it: enough to name it and link to it. */
export interface SessionGoal {
  id: number;
  name: string | null;
}

type GoalRow = Pick<typeof goals.$inferSelect, "goalId" | "name" | "goalType" | "config">;

/**
 * Every goal condition is evaluated against every event of the period, so the
 * number of goals a session query will look at is capped. A site past the cap
 * reports conversions for its oldest goals only.
 */
export const MAX_SESSION_GOALS = 50;

/** No goals: the typed empty array, so the column exists either way. */
const NO_GOALS_EXPRESSION = "emptyArrayUInt32()";

export interface SessionGoalMatcher {
  /** The goals the expression can report, i.e. those with a usable condition. */
  goals: SessionGoal[];
  /**
   * Per-event SQL expression of type Array(UInt32): the ids of the goals this
   * event completes. Reads the unqualified `events` columns.
   */
  expression: string;
}

/**
 * Turns a site's goals into one expression that tags an event with the goals
 * it completes, using the same conditions the Goals page counts with
 * (buildGoalCondition), so a session marked as converted here is one the Goals
 * page counted.
 */
export function buildSessionGoalMatcher(siteGoals: GoalRow[]): SessionGoalMatcher {
  const matched: SessionGoal[] = [];
  const branches: string[] = [];

  for (const goal of siteGoals.slice(0, MAX_SESSION_GOALS)) {
    const condition = buildGoalCondition(goal);
    if (!condition) continue;
    // goalId is a Postgres serial; coerced so nothing but a number can reach the SQL.
    const id = Number(goal.goalId);
    if (!Number.isInteger(id) || id <= 0) continue;

    matched.push({ id, name: goal.name });
    branches.push(`if((${condition}), toUInt32(${id}), toUInt32(0))`);
  }

  return {
    goals: matched,
    expression: branches.length ? `arrayFilter(x -> x != 0, [${branches.join(", ")}])` : NO_GOALS_EXPRESSION,
  };
}

export async function getSessionGoalMatcher(siteId: number): Promise<SessionGoalMatcher> {
  const siteGoals = await db
    .select({ goalId: goals.goalId, name: goals.name, goalType: goals.goalType, config: goals.config })
    .from(goals)
    .where(eq(goals.siteId, siteId))
    .orderBy(asc(goals.goalId))
    .limit(MAX_SESSION_GOALS);

  return buildSessionGoalMatcher(siteGoals);
}

/**
 * Goal ids back to goals, most recent conversion first: `latest` are the goals
 * the session's last converting event completed, `all` every goal it completed.
 */
export function resolveSessionGoals(matcher: SessionGoalMatcher, latest: number[], all: number[]): SessionGoal[] {
  const byId = new Map(matcher.goals.map(goal => [goal.id, goal]));
  const ordered = [...new Set([...latest, ...[...all].sort((a, b) => a - b)])];
  return ordered.flatMap(id => byId.get(Number(id)) ?? []);
}
