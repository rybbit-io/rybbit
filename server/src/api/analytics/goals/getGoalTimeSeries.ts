import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { and, inArray, eq } from "drizzle-orm";
import SqlString from "sqlstring";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { db } from "../../../db/postgres/postgres.js";
import { goals } from "../../../db/postgres/schema.js";
import { TimeBucket } from "../types.js";
import { getFilterStatement } from "../utils/getFilterStatement.js";
import { getTimeStatement, processResults, TimeBucketToFn } from "../utils/utils.js";
import { buildGoalCondition } from "./goalConditions.js";

type GoalTimeSeriesPoint = {
  time: string;
  goal_id: number;
  conversions: number;
  total_sessions: number;
  conversion_rate: number;
};

type GetGoalTimeSeriesRequest = {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    bucket: TimeBucket;
    goal_ids?: string | number[];
  }>;
};

const parseGoalIds = (value: string | number[] | undefined) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map(Number).filter(Number.isFinite);
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map(Number).filter(Number.isFinite);
    }
  } catch {
    // Fall back to comma-separated values.
  }

  return value.split(",").map(Number).filter(Number.isFinite);
};

export async function getGoalTimeSeries(req: FastifyRequest<GetGoalTimeSeriesRequest>, res: FastifyReply) {
  const siteId = Number(req.params.siteId);
  const { bucket = "hour" } = req.query;
  const timeZone = req.query.time_zone || "UTC";

  if (!TimeBucketToFn[bucket]) {
    return res.status(400).send({ error: `Invalid bucket value: ${bucket}` });
  }

  const goalIds = [...new Set(parseGoalIds(req.query.goal_ids))];
  if (goalIds.length === 0) {
    return res.send({ data: [] });
  }

  try {
    const siteGoals = await db
      .select()
      .from(goals)
      .where(and(eq(goals.siteId, siteId), inArray(goals.goalId, goalIds)));

    if (siteGoals.length === 0) {
      return res.send({ data: [] });
    }

    const timeStatement = getTimeStatement(req.query);
    const filterStatement = getFilterStatement(req.query.filters, siteId, timeStatement);
    const bucketFn = TimeBucketToFn[bucket];

    const conversionQueries = siteGoals
      .map(goal => {
        const goalCondition = buildGoalCondition(goal);
        if (!goalCondition) return null;

        return `
          SELECT
            toDateTime(${bucketFn}(toTimeZone(timestamp, {timeZone:String}))) AS time,
            ${SqlString.escape(goal.goalId)} AS goal_id,
            COUNT(DISTINCT session_id) AS conversions
          FROM events
          WHERE
            site_id = {siteId:Int32}
            AND (${goalCondition})
            ${timeStatement}
            ${filterStatement}
          GROUP BY time, goal_id
        `;
      })
      .filter(Boolean);

    if (conversionQueries.length === 0) {
      return res.send({ data: [] });
    }

    const validGoalIds = siteGoals.map(goal => goal.goalId).join(", ");
    const query = `
      WITH
        sessions_by_bucket AS (
          SELECT
            toDateTime(${bucketFn}(toTimeZone(timestamp, {timeZone:String}))) AS time,
            COUNT(DISTINCT session_id) AS total_sessions
          FROM events
          WHERE
            site_id = {siteId:Int32}
            ${timeStatement}
            ${filterStatement}
          GROUP BY time
        ),
        goal_ids AS (
          SELECT arrayJoin([${validGoalIds}]) AS goal_id
        ),
        conversions_by_goal AS (
          ${conversionQueries.join("\nUNION ALL\n")}
        )
      SELECT
        s.time AS time,
        g.goal_id AS goal_id,
        ifNull(c.conversions, 0) AS conversions,
        s.total_sessions AS total_sessions,
        if(s.total_sessions > 0, ifNull(c.conversions, 0) / s.total_sessions, 0) AS conversion_rate
      FROM sessions_by_bucket s
      CROSS JOIN goal_ids g
      LEFT JOIN conversions_by_goal c ON c.time = s.time AND c.goal_id = g.goal_id
      ORDER BY s.time ASC, g.goal_id ASC
    `;

    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteId,
        timeZone,
      },
    });

    const data = await processResults<GoalTimeSeriesPoint>(result);
    return res.send({ data });
  } catch (error) {
    console.error("Error fetching goal time series:", error);
    return res.status(500).send({ error: "Failed to fetch goal time series" });
  }
}
