import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { db } from "../../../db/postgres/postgres.js";
import { goals } from "../../../db/postgres/schema.js";
import { eq } from "drizzle-orm";
import { getTimeStatement, processResults, patternToRegex } from "../utils/utils.js";
import { FilterParams } from "@rybbit/shared";
import { GetSessionsResponse } from "../getSessions.js";
import SqlString from "sqlstring";

export interface GetGoalSessionsRequest {
  Params: {
    site: string;
    goalId: string;
  };
  Querystring: FilterParams<{
    limit?: number;
    page: number;
  }>;
}

export async function getGoalSessions(req: FastifyRequest<GetGoalSessionsRequest>, res: FastifyReply) {
  const { goalId, site } = req.params;
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
    if (goalData.siteId !== Number(site)) {
      return res.status(403).send({ error: "Goal does not belong to this site" });
    }

    const timeStatement = getTimeStatement(req.query);

    // Build the goal matching condition
    let goalCondition = "";

    if (goalData.goalType === "path") {
      const pathPattern = goalData.config.pathPattern;
      if (!pathPattern) {
        return res.status(400).send({ error: "Invalid path goal configuration" });
      }

      const regex = patternToRegex(pathPattern);
      goalCondition = `type = 'pageview' AND match(pathname, ${SqlString.escape(regex)})`;
    } else if (goalData.goalType === "event") {
      const eventName = goalData.config.eventName;
      if (!eventName) {
        return res.status(400).send({ error: "Invalid event goal configuration" });
      }

      goalCondition = `type = 'custom_event' AND event_name = ${SqlString.escape(eventName)}`;

      // Add property matching if needed
      const eventPropertyKey = goalData.config.eventPropertyKey;
      const eventPropertyValue = goalData.config.eventPropertyValue;

      if (eventPropertyKey && eventPropertyValue !== undefined) {
        const propValueAccessor = `props.${SqlString.escapeId(eventPropertyKey)}`;

        if (typeof eventPropertyValue === "string") {
          goalCondition += ` AND toString(${propValueAccessor}) = ${SqlString.escape(eventPropertyValue)}`;
        } else if (typeof eventPropertyValue === "number") {
          goalCondition += ` AND toFloat64OrNull(${propValueAccessor}) = ${SqlString.escape(eventPropertyValue)}`;
        } else if (typeof eventPropertyValue === "boolean") {
          goalCondition += ` AND toUInt8OrNull(${propValueAccessor}) = ${eventPropertyValue ? 1 : 0}`;
        }
      }
    } else {
      return res.status(400).send({ error: "Invalid goal type" });
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
        argMax(e.lon, e.timestamp) AS lon
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
        siteId: Number(site),
        limit: limit || 25,
        offset: (page - 1) * (limit || 25),
      },
    });

    const data = await processResults<GetSessionsResponse[number]>(result);
    return res.send({ data });
  } catch (error) {
    console.error("Error fetching goal sessions:", error);
    return res.status(500).send({ error: "Failed to fetch goal sessions" });
  }
}
