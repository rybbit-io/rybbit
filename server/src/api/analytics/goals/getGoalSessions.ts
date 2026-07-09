import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { db } from "../../../db/postgres/postgres.js";
import { goals } from "../../../db/postgres/schema.js";
import { eq } from "drizzle-orm";
import { getTimeStatement, processResults } from "../utils/utils.js";
import { FilterParams } from "@rybbit/shared";
import { GetSessionsResponse } from "../sessions/getSessions.js";
import { buildGoalCondition } from "./goalConditions.js";

export interface GetGoalSessionsRequest {
  Params: {
    siteId: string;
    goalId: string;
  };
  Querystring: FilterParams<{
    limit?: number;
    page: number;
  }>;
}

export async function getGoalSessions(req: FastifyRequest<GetGoalSessionsRequest>, res: FastifyReply) {
  const { goalId, siteId } = req.params;
  const { page, limit } = req.query;

  try {
    // Fetch the goal from PostgreSQL
    const goal = await db
      .select()
      .from(goals)
      .where(eq(goals.goalId, Number(goalId)))
      .limit(1);

    if (!goal || goal.length === 0) {
      return res.status(404).send({ error: "Goal not found" });
    }

    const goalData = goal[0];

    // Verify the goal belongs to the site
    if (goalData.siteId !== Number(siteId)) {
      return res.status(403).send({ error: "Goal does not belong to this site" });
    }

    const timeStatement = getTimeStatement(req.query);

    // Build the goal matching condition
    const goalCondition = buildGoalCondition(goalData);
    if (!goalCondition) {
      return res.status(400).send({ error: "Invalid goal configuration" });
    }

    // Build query to find sessions that match the goal
    // First, find all session_ids that have at least one event matching the goal
    const query = `
    WITH GoalSessions AS (
      SELECT DISTINCT session_id
      FROM events
      WHERE
        site_id = {siteId:Int32}
        AND (${goalCondition})
        ${timeStatement}
    ),
    AggregatedSessions AS (
      SELECT
        e.session_id,
        e.user_id,
        argMax(e.country, e.timestamp) AS country,
        argMax(e.region, e.timestamp) AS region,
        argMax(e.city, e.timestamp) AS city,
        argMax(e.language, e.timestamp) AS language,
        argMax(e.device_type, e.timestamp) AS device_type,
        argMax(e.browser, e.timestamp) AS browser,
        argMax(e.browser_version, e.timestamp) AS browser_version,
        argMax(e.operating_system, e.timestamp) AS operating_system,
        argMax(e.operating_system_version, e.timestamp) AS operating_system_version,
        argMax(e.screen_width, e.timestamp) AS screen_width,
        argMax(e.screen_height, e.timestamp) AS screen_height,
        argMin(e.referrer, e.timestamp) AS referrer,
        argMin(e.channel, e.timestamp) AS channel,
        argMin(e.hostname, e.timestamp) AS hostname,
        argMin(e.page_title, e.timestamp) AS page_title,
        argMin(e.querystring, e.timestamp) AS querystring,
        argMin(e.url_parameters, e.timestamp)['utm_source'] AS utm_source,
        argMin(e.url_parameters, e.timestamp)['utm_medium'] AS utm_medium,
        argMin(e.url_parameters, e.timestamp)['utm_campaign'] AS utm_campaign,
        argMin(e.url_parameters, e.timestamp)['utm_term'] AS utm_term,
        argMin(e.url_parameters, e.timestamp)['utm_content'] AS utm_content,
        MAX(e.timestamp) AS session_end,
        MIN(e.timestamp) AS session_start,
        dateDiff('second', MIN(e.timestamp), MAX(e.timestamp)) AS session_duration,
        argMinIf(e.pathname, e.timestamp, e.type = 'pageview') AS entry_page,
        argMaxIf(e.pathname, e.timestamp, e.type = 'pageview') AS exit_page,
        countIf(e.type = 'pageview') AS pageviews,
        countIf(e.type = 'custom_event') AS events,
        countIf(e.type = 'error') AS errors,
        countIf(e.type = 'outbound') AS outbound,
        argMax(e.ip, e.timestamp) AS ip,
        argMax(e.lat, e.timestamp) AS lat,
        argMax(e.lon, e.timestamp) AS lon,
        argMax(e.tag, e.timestamp) AS tag
      FROM events e
      INNER JOIN GoalSessions gs ON e.session_id = gs.session_id
      WHERE
        e.site_id = {siteId:Int32}
        ${timeStatement}
      GROUP BY
        e.session_id,
        e.user_id
      ORDER BY session_end DESC
    )
    SELECT *
    FROM AggregatedSessions
    LIMIT {limit:Int32} OFFSET {offset:Int32}
    `;

    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteId: Number(siteId),
        limit: limit || 25,
        offset: ((page || 1) - 1) * (limit || 25),
      },
    });

    const data = await processResults<GetSessionsResponse[number]>(result);
    return res.send({ data });
  } catch (error) {
    console.error("Error fetching goal sessions:", error);
    return res.status(500).send({ error: "Failed to fetch goal sessions" });
  }
}
