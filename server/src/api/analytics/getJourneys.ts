import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import {
  buildJourneyFragments,
  JourneyOptions,
  JourneyQuerySpec,
  JourneyQuerystring,
  parseJourneyOptions,
  resolveJourneyGoal,
} from "./journeyPaths.js";
import { AnalyticsQueryError, runAnalyticsQuery } from "./utils/analyticsQuery.js";

interface GetJourneysRequest {
  Params: { siteId: string };
  Querystring: FilterParams<JourneyQuerystring & { limit?: string }>;
}

type JourneyRow = {
  journey: string[];
  sessions_count: number;
  conversions?: number;
  total_sessions: number;
  percentage: number;
};

export const buildJourneysQuery = (
  query: GetJourneysRequest["Querystring"],
  siteId: number,
  options: JourneyOptions,
  journeyLimit: number
): JourneyQuerySpec => {
  const { ctes, convertedExpression, params } = buildJourneyFragments(query, siteId, options);

  // Each journey's share is of the sessions that visited two or more pages:
  // the population journeys are drawn from, whatever the step filters keep.
  return {
    query: `
        WITH ${ctes},

        journey_segments AS (
          SELECT
            journey,
            count() AS sessions_count
            ${convertedExpression ? `, countIf(${convertedExpression}) AS conversions` : ""}
          FROM session_journeys
          GROUP BY journey
          ORDER BY sessions_count DESC, journey ASC
          LIMIT {journeyLimit:Int32}
        )

        SELECT
          journey,
          sessions_count,
          ${convertedExpression ? "conversions," : ""}
          total_sessions,
          sessions_count * 100 / total_sessions AS percentage
        FROM journey_segments
        CROSS JOIN (SELECT count() AS total_sessions FROM user_paths) AS totals
        ORDER BY sessions_count DESC, journey ASC
      `,
    params: { ...params, journeyLimit },
  };
};

export const getJourneys = async (request: FastifyRequest<GetJourneysRequest>, reply: FastifyReply) => {
  try {
    const siteId = parseInt(request.params.siteId, 10);
    const journeyLimit = parseInt(request.query.limit ?? "100", 10);

    const parsed = parseJourneyOptions(request.query);
    if (!parsed.ok) {
      return reply.status(400).send({ error: parsed.error });
    }

    if (isNaN(journeyLimit) || journeyLimit < 1 || journeyLimit > 500) {
      return reply.status(400).send({
        error: "Limit parameter must be a number between 1 and 500",
      });
    }

    const goal = await resolveJourneyGoal(parsed.goalId, siteId);
    if (!goal.ok) {
      return reply.status(goal.status).send({ error: goal.error });
    }

    const data = await runAnalyticsQuery<JourneyRow>(
      buildJourneysQuery(request.query, siteId, { ...parsed.options, goalCondition: goal.goalCondition }, journeyLimit)
    );

    return reply.send({
      journeys: data.map(item => ({
        path: item.journey,
        count: Number(item.sessions_count),
        percentage: Number(item.percentage),
        ...(item.conversions !== undefined ? { conversions: Number(item.conversions) } : {}),
      })),
      // Sessions with two or more pages in the period, before the step filters.
      totalSessions: Number(data[0]?.total_sessions ?? 0),
    });
  } catch (error) {
    request.log.error({ err: error instanceof AnalyticsQueryError ? error.original : error }, "Error getting journeys");
    return reply.status(500).send({ error: "Failed to get journeys" });
  }
};
