import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/postgres/postgres.js";
import { goals } from "../../db/postgres/schema.js";
import { buildGoalCondition } from "./goals/goalConditions.js";
import { QuerySpec } from "./utils/analyticsQuery.js";
import { buildFilteredSessionsCTE } from "./utils/sessionFilters.js";
import { getTimeStatement } from "./utils/timeWindow.js";
import { patternToRegex } from "./utils/utils.js";

/**
 * How a session becomes a journey, shared by the three journeys endpoints (the
 * paths, their summary, and the sessions behind one path) so that a row and the
 * sessions it opens are the same sessions by construction.
 */

/** A journeys query always binds parameters (at least the site). */
export type JourneyQuerySpec = Required<QuerySpec>;

export const MIN_JOURNEY_STEPS = 2;
export const MAX_JOURNEY_STEPS = 10;

// stepFilters arrives as a JSON object mapping a (numeric) step index to a path
// pattern. Both the keys and values are attacker-controlled, so validate the
// shape before any of it reaches the ClickHouse query.
export const stepFiltersSchema = z.record(
  z.string().regex(/^\d+$/, "Step index must be a non-negative integer"),
  z.string().max(2048)
);

export const journeyGroupingSchema = z.enum(["path", "section"]);
export type JourneyGrouping = z.infer<typeof journeyGroupingSchema>;

export const journeyOptionsSchema = z.object({
  endsAt: z.string().max(2048).optional(),
  groupBy: journeyGroupingSchema.default("path"),
  goalId: z.coerce.number().int().positive().optional(),
});

export interface JourneyQuerystring {
  steps?: string;
  stepFilters?: string;
  endsAt?: string;
  groupBy?: string;
  goalId?: string;
}

export interface JourneyOptions {
  maxSteps: number;
  stepFilters: Record<string, string>;
  /** Path pattern. Journeys are cut at the first visit to it after the entry page. */
  endsAt?: string;
  groupBy: JourneyGrouping;
  /** A goal's ClickHouse condition; adds a `conversions` count per journey. */
  goalCondition?: string;
}

type ParsedJourneyOptions =
  | { ok: true; options: Omit<JourneyOptions, "goalCondition">; goalId?: number }
  | { ok: false; error: string };

/** Validates the query params the journeys endpoints share. */
export const parseJourneyOptions = (query: JourneyQuerystring): ParsedJourneyOptions => {
  const maxSteps = parseInt(query.steps ?? "3", 10);
  if (isNaN(maxSteps) || maxSteps < MIN_JOURNEY_STEPS || maxSteps > MAX_JOURNEY_STEPS) {
    return { ok: false, error: "Steps parameter must be a number between 2 and 10" };
  }

  let stepFilters: Record<string, string> = {};
  if (query.stepFilters) {
    try {
      stepFilters = stepFiltersSchema.parse(JSON.parse(query.stepFilters));
    } catch {
      return { ok: false, error: "Invalid stepFilters format" };
    }
  }

  const parsed = journeyOptionsSchema.safeParse({
    endsAt: query.endsAt,
    groupBy: query.groupBy,
    goalId: query.goalId,
  });
  if (!parsed.success) {
    return { ok: false, error: "Invalid journey options" };
  }

  return {
    ok: true,
    options: {
      maxSteps,
      stepFilters,
      endsAt: parsed.data.endsAt?.trim() || undefined,
      groupBy: parsed.data.groupBy,
    },
    goalId: parsed.data.goalId,
  };
};

type GoalLookup = { ok: true; goalCondition?: string } | { ok: false; status: number; error: string };

/** Loads the goal a journey report measures conversion against, checking it belongs to the site. */
export const resolveJourneyGoal = async (goalId: number | undefined, siteId: number): Promise<GoalLookup> => {
  if (goalId === undefined) return { ok: true };

  const [goal] = await db.select().from(goals).where(eq(goals.goalId, goalId)).limit(1);
  if (!goal) return { ok: false, status: 404, error: "Goal not found" };
  if (goal.siteId !== siteId) return { ok: false, status: 403, error: "Goal does not belong to this site" };

  const goalCondition = buildGoalCondition(goal);
  if (!goalCondition) return { ok: false, status: 400, error: "Invalid goal configuration" };

  return { ok: true, goalCondition };
};

// Pages below a first-level section collapse into that section: /docs/script and
// /docs/api/events both become /docs/**. Top-level pages (/, /pricing, /docs)
// keep their own name. The result is itself a valid path pattern, so it works
// unchanged as a step filter or a funnel step.
const SECTION_OF_PAGE = "if(match(p, '^/[^/]+/.+'), concat(extract(p, '^(/[^/]+)/'), '/**'), p)";

/**
 * A predicate matching `subject` against a path pattern (* is one segment, ** is
 * any number), bound as a query parameter rather than written into the SQL.
 */
const pagePredicate = (subject: string, pattern: string, paramName: string, params: Record<string, unknown>) => {
  if (pattern.includes("*")) {
    params[paramName] = patternToRegex(pattern);
    return `match(${subject}, {${paramName}:String})`;
  }
  params[paramName] = pattern;
  return `${subject} = {${paramName}:String}`;
};

export interface JourneyFragments {
  /**
   * The CTEs, comma-separated, without `WITH` and without a trailing comma:
   *   - `session_paths`: every session with a pageview and its page sequence
   *   - `user_paths`: the sessions that visited two or more pages
   *   - `session_journeys`: each of those sessions' journey, already narrowed
   *     by the step filters and, with `endsAt`, to the sessions that reach it
   *   - `GoalSessions` (with a goal): the sessions that completed the goal
   */
  ctes: string;
  /** SQL for "this session completed the goal", or null without a goal. */
  convertedExpression: string | null;
  params: Record<string, unknown>;
}

export const buildJourneyFragments = (
  query: { filters: string } & Parameters<typeof getTimeStatement>[0],
  siteId: number,
  options: JourneyOptions
): JourneyFragments => {
  const params: Record<string, unknown> = { siteId, maxSteps: options.maxSteps };
  const timeStatement = getTimeStatement(query);
  const filteredSessionsCTE = buildFilteredSessionsCTE(query.filters, siteId, timeStatement);
  const filteredSessionsJoin = filteredSessionsCTE ? "INNER JOIN FilteredSessions USING (session_id)" : "";

  const pages =
    options.groupBy === "section" ? `arrayCompact(arrayMap(p -> ${SECTION_OF_PAGE}, path_sequence))` : "path_sequence";

  // A journey is the first `maxSteps` pages of the session. With an end page it
  // is instead the path up to the first visit to that page after the entry
  // page, when that visit falls within `maxSteps`; other sessions are dropped.
  let journey = "arraySlice(pages, 1, {maxSteps:Int32})";
  const journeyConditions: string[] = [];
  if (options.endsAt) {
    const reachesEnd = pagePredicate("p", options.endsAt, "endsAt", params);
    const endIndex = `arrayFirstIndex((p, i) -> i >= 2 AND ${reachesEnd}, pages, arrayEnumerate(pages))`;
    journey = `if(${endIndex} BETWEEN 2 AND {maxSteps:Int32}, arraySlice(pages, 1, ${endIndex}), emptyArrayString())`;
    journeyConditions.push("notEmpty(journey)");
  }

  // Wildcard patterns: * matches a single segment, ** matches several.
  for (const [step, pattern] of Object.entries(options.stepFilters)) {
    const stepIndex = parseInt(step, 10) + 1; // ClickHouse arrays are 1-indexed
    // A filter on a step the journey does not have can only match nothing.
    if (pattern === "" || stepIndex > options.maxSteps) continue;
    journeyConditions.push(pagePredicate(`journey[${stepIndex}]`, pattern, `stepFilter${stepIndex}`, params));
  }

  const ctes = [
    filteredSessionsCTE,
    options.goalCondition
      ? `GoalSessions AS (
          SELECT DISTINCT session_id
          FROM events
          WHERE
            site_id = {siteId:Int32}
            ${timeStatement || ""}
            AND (${options.goalCondition})
        )`
      : null,
    `session_paths AS (
          SELECT
            session_id,
            arrayCompact(groupArray(pathname)) AS path_sequence
          FROM (
            SELECT
              session_id,
              pathname,
              timestamp
            FROM events
            ${filteredSessionsJoin}
            WHERE
              site_id = {siteId:Int32}
              ${timeStatement || ""}
              AND type = 'pageview'
            ORDER BY session_id, timestamp
          )
          GROUP BY session_id
        )`,
    `user_paths AS (
          SELECT session_id, path_sequence
          FROM session_paths
          WHERE length(path_sequence) >= 2
        )`,
    `session_journeys AS (
          SELECT session_id, journey
          FROM (
            SELECT session_id, ${journey} AS journey
            FROM (
              SELECT session_id, ${pages} AS pages
              FROM user_paths
            )
          )
          ${journeyConditions.length ? `WHERE ${journeyConditions.join(" AND ")}` : ""}
        )`,
  ].filter((cte): cte is string => !!cte);

  return {
    ctes: ctes.join(",\n        "),
    convertedExpression: options.goalCondition ? "session_id IN (SELECT session_id FROM GoalSessions)" : null,
    params,
  };
};
