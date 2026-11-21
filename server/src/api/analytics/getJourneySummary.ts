import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import {
  buildJourneyFragments,
  JourneyOptions,
  JourneyQuerySpec,
  parseJourneyOptions,
  resolveJourneyGoal,
} from "./journeyPaths.js";
import { analyticsRoute, runAnalyticsQuery } from "./utils/analyticsQuery.js";

interface GetJourneySummaryRequest {
  Params: { siteId: string };
  Querystring: FilterParams<{ goalId?: string }>;
}

type JourneySummaryRow = {
  sessions: number;
  pages: number;
  conversions: number;
  top_exit_page: string;
  top_exit_sessions: number;
};

export interface JourneySummary {
  /** Sessions that visited two or more pages. */
  sessions: number;
  /** Mean number of pages on those sessions' paths (a reloaded page counts once). */
  avgPathLength: number;
  /** How many of those sessions completed the goal; null without a goal. */
  conversions: number | null;
  /** The page most of those sessions ended on. */
  topExit: { page: string; sessions: number } | null;
}

/**
 * The page-level figures for the journeys page. One pass over the period's
 * pageviews: sessions are grouped by their last page first, so the totals and
 * the most common exit page come out of the same aggregation.
 */
export const buildJourneySummaryQuery = (
  query: GetJourneySummaryRequest["Querystring"],
  siteId: number,
  goalCondition?: string
): JourneyQuerySpec => {
  const options: JourneyOptions = { maxSteps: 2, stepFilters: {}, groupBy: "path", goalCondition };
  const { ctes, convertedExpression, params } = buildJourneyFragments(query, siteId, options);

  return {
    query: `
        WITH ${ctes}

        SELECT
          sum(exit_sessions) AS sessions,
          sum(exit_pages) AS pages,
          sum(exit_conversions) AS conversions,
          argMax(exit_page, exit_sessions) AS top_exit_page,
          max(exit_sessions) AS top_exit_sessions
        FROM (
          SELECT
            path_sequence[length(path_sequence)] AS exit_page,
            count() AS exit_sessions,
            sum(length(path_sequence)) AS exit_pages,
            ${convertedExpression ? `countIf(${convertedExpression})` : "0"} AS exit_conversions
          FROM user_paths
          GROUP BY exit_page
        )
      `,
    params,
  };
};

export const getJourneySummary = analyticsRoute<GetJourneySummaryRequest>(
  "journey summary",
  async (request: FastifyRequest<GetJourneySummaryRequest>, reply: FastifyReply) => {
    const siteId = parseInt(request.params.siteId, 10);

    const parsed = parseJourneyOptions({ goalId: request.query.goalId });
    if (!parsed.ok) {
      return reply.status(400).send({ error: parsed.error });
    }

    const goal = await resolveJourneyGoal(parsed.goalId, siteId);
    if (!goal.ok) {
      return reply.status(goal.status).send({ error: goal.error });
    }

    const [row] = await runAnalyticsQuery<JourneySummaryRow>(
      buildJourneySummaryQuery(request.query, siteId, goal.goalCondition)
    );

    const sessions = Number(row?.sessions ?? 0);
    const data: JourneySummary = {
      sessions,
      avgPathLength: sessions > 0 ? Number(row.pages) / sessions : 0,
      conversions: goal.goalCondition ? Number(row?.conversions ?? 0) : null,
      topExit: sessions > 0 ? { page: row.top_exit_page, sessions: Number(row.top_exit_sessions) } : null,
    };

    return reply.send({ data });
  }
);
