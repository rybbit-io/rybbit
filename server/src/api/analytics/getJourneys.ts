import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getFilterStatement } from "./utils/getFilterStatement.js";
import { getTimeStatement } from "./utils/utils.js";

export const getJourneys = async (
  request: FastifyRequest<{
    Params: { site: string };
    Querystring: FilterParams<{
      steps?: string;
      limit?: string;
      stepFilters?: string;
    }>;
  }>,
  reply: FastifyReply
) => {
  try {
    const { site } = request.params;
    const { steps = "3", limit = "100", filters, stepFilters } = request.query;

    const maxSteps = parseInt(steps, 10);
    const journeyLimit = parseInt(limit, 10);

    if (isNaN(maxSteps) || maxSteps < 2 || maxSteps > 10) {
      return reply.status(400).send({
        error: "Steps parameter must be a number between 2 and 10",
      });
    }

    if (isNaN(journeyLimit) || journeyLimit < 1 || journeyLimit > 500) {
      return reply.status(400).send({
        error: "Limit parameter must be a number between 1 and 500",
      });
    }

    // Time conditions using getTimeStatement
    const timeStatement = getTimeStatement(request.query);
    const filterStatement = getFilterStatement(filters, Number(site), timeStatement);

    // Parse step filters
    let parsedStepFilters: Record<number, string> = {};
    if (stepFilters) {
      try {
        parsedStepFilters = JSON.parse(stepFilters);
      } catch (error) {
        return reply.status(400).send({
          error: "Invalid stepFilters format",
        });
      }
    }

    // Build step filter conditions for the HAVING clause
    const stepFilterConditions = Object.entries(parsedStepFilters)
      .map(([step, path]) => {
        const stepIndex = parseInt(step, 10) + 1; // ClickHouse arrays are 1-indexed
        return `journey[${stepIndex}] = '${path.replace(/'/g, "''")}'`;
      })
      .join(" AND ");

    // Query to find sequences of events (journeys) for each user
    const result = await clickhouse.query({
      query: `
        WITH user_paths AS (
          SELECT
            session_id,
            arrayCompact(groupArray(pathname)) AS path_sequence
          FROM (
            SELECT
              session_id,
              pathname,
              timestamp
            FROM events
            WHERE
              site_id = {siteId:Int32}
              ${timeStatement || ""}
              ${filterStatement || ""}
              AND type = 'pageview'
            ORDER BY session_id, timestamp
          )
          GROUP BY session_id
          HAVING length(path_sequence) >= 2
        ),

        journey_segments AS (
          SELECT
            arraySlice(path_sequence, 1, {maxSteps:Int32}) AS journey,
            count() AS sessions_count
          FROM user_paths
          GROUP BY journey
          ${stepFilterConditions ? `HAVING ${stepFilterConditions}` : ""}
          ORDER BY sessions_count DESC
          LIMIT {journeyLimit:Int32}
        )

        SELECT
          journey,
          sessions_count,
          sessions_count * 100 / (
            SELECT count(DISTINCT session_id)
            FROM events
            WHERE site_id = {siteId:Int32}
            ${timeStatement || ""}
            ${filterStatement || ""}
          ) AS percentage
        FROM journey_segments
      `,
      query_params: {
        siteId: parseInt(site, 10),
        maxSteps: maxSteps,
        journeyLimit: journeyLimit,
      },
    });

    const data = await result.json();

    return reply.send({
      journeys: data.data.map((item: any) => ({
        path: item.journey,
        count: Number(item.sessions_count),
        percentage: Number(item.percentage),
      })),
    });
  } catch (error) {
    console.error("Error getting journeys:", error);
    return reply.status(500).send({ error: "Failed to get journeys" });
  }
};
