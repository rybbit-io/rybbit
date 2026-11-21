import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { goals } from "../../../db/postgres/schema.js";
import { TimeBucket } from "../types.js";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";
import { TimeBucketToFn } from "../utils/timeWindow.js";
import { buildGoalsConversionsQuery, buildGoalsTotalSessionsQuery } from "./getGoals.js";
import { buildGoalTimeSeriesQuery } from "./getGoalTimeSeries.js";
import { buildGoalCondition } from "./goalConditions.js";
import { GoalBody, goalBodySchema } from "./goalSchema.js";

type SiteGoal = typeof goals.$inferSelect;

// No stored goal has id 0 (the column is a serial), so the draft cannot be
// mistaken for one in the shared query builders.
const DRAFT_GOAL_ID = 0;

export interface GoalPreview {
  /** Sessions in the window that would have completed the goal. */
  conversions: number;
  total_sessions: number;
  conversion_rate: number;
  series: { time: string; conversions: number }[];
}

interface GetGoalPreviewRequest {
  Params: { siteId: string };
  Body: GoalBody;
  Querystring: FilterParams<{ bucket?: TimeBucket }>;
}

/**
 * A goal that has not been saved, in the shape the stored-goal query builders
 * take. The preview runs exactly the SQL a saved goal would, so what it
 * reports is what the ledger shows once the goal exists.
 */
export const draftGoal = (siteId: number, body: Pick<GoalBody, "goalType" | "config">): SiteGoal => ({
  goalId: DRAFT_GOAL_ID,
  siteId,
  name: null,
  goalType: body.goalType,
  config: body.config,
  createdAt: null,
});

/**
 * What a goal would have counted in the selected window, before it is saved:
 * goals are evaluated at query time over events that already exist, so the
 * answer is the same one the goal will show once created.
 */
export const getGoalPreview = analyticsRoute<GetGoalPreviewRequest>(
  "goal preview",
  async (request: FastifyRequest<GetGoalPreviewRequest>, reply: FastifyReply) => {
    const siteId = Number(request.params.siteId);
    const { bucket = "hour" } = request.query;

    if (!TimeBucketToFn[bucket]) {
      return reply.status(400).send({ error: `Invalid bucket value: ${bucket}` });
    }

    const parsed = goalBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation error", details: parsed.error.errors });
    }

    const goal = draftGoal(siteId, parsed.data);
    if (!buildGoalCondition(goal)) {
      return reply.status(400).send({ error: "Invalid goal configuration" });
    }

    const query = { ...request.query, bucket };
    const conversionsQuery = buildGoalsConversionsQuery(query, siteId, [goal]);
    const seriesQuery = buildGoalTimeSeriesQuery(query, siteId, [goal]);
    if (conversionsQuery === null || seriesQuery === null) {
      return reply.status(400).send({ error: "Invalid goal configuration" });
    }

    const [totalSessionsData, conversionsData, seriesData] = await Promise.all([
      runAnalyticsQuery<{ total_sessions: number }>({ query: buildGoalsTotalSessionsQuery(query, siteId) }),
      runAnalyticsQuery<Record<string, number>>({ query: conversionsQuery }),
      runAnalyticsQuery<{ time: string; conversions: number }>({
        query: seriesQuery,
        params: { siteId, timeZone: request.query.time_zone || "UTC" },
      }),
    ]);

    const totalSessions = Number(totalSessionsData[0]?.total_sessions) || 0;
    const conversions = Number(conversionsData[0]?.[`goal_${DRAFT_GOAL_ID}_conversions`]) || 0;

    const preview: GoalPreview = {
      conversions,
      total_sessions: totalSessions,
      conversion_rate: totalSessions > 0 ? conversions / totalSessions : 0,
      series: seriesData.map(point => ({ time: point.time, conversions: Number(point.conversions) || 0 })),
    };

    return reply.send({ data: preview });
  }
);
