import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/postgres/postgres.js";
import { goals } from "../../../db/postgres/schema.js";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { eq, desc, asc, sql } from "drizzle-orm";
import { getTimeStatement, processResults, patternToRegex } from "../utils/utils.js";
import SqlString from "sqlstring";
import { FilterParams } from "@rybbit/shared";
import { getFilterStatement } from "../utils/getFilterStatement.js";

// Types for the response
interface GoalWithConversions {
  goalId: number;
  name: string | null;
  goalType: string;
  config: any;
  createdAt: string | null;
  total_conversions: number;
  total_sessions: number;
  conversion_rate: number;
}

interface GetGoalsResponse {
  data: GoalWithConversions[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export async function getGoals(
  request: FastifyRequest<{
    Params: {
      siteId: string;
    };
    Querystring: FilterParams<{
      page?: string;
      page_size?: string;
      sort?: string;
      order?: "asc" | "desc";
    }>;
  }>,
  reply: FastifyReply
) {
  const { siteId } = request.params;
  const { filters, page = "1", page_size: pageSize = "10", sort = "createdAt", order = "desc" } = request.query;

  const pageNumber = parseInt(page, 10);
  const pageSizeNumber = parseInt(pageSize, 10);

  // Validate page and pageSize
  if (isNaN(pageNumber) || pageNumber < 1) {
    return reply.status(400).send({ error: "Invalid page number" });
  }

  if (isNaN(pageSizeNumber) || pageSizeNumber < 1 || pageSizeNumber > 100) {
    return reply.status(400).send({ error: "Invalid page size, must be between 1 and 100" });
  }

  try {
    // Count total goals for pagination metadata
    const totalGoalsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(goals)
      .where(eq(goals.siteId, Number(siteId)));

    const totalGoals = totalGoalsResult[0]?.count || 0;
    const totalPages = Math.ceil(totalGoals / pageSizeNumber);

    // If no goals exist, return early with empty data
    if (totalGoals === 0) {
      return reply.send({
        data: [],
        meta: {
          total: 0,
          page: pageNumber,
          pageSize: pageSizeNumber,
          totalPages: 0,
        },
      });
    }

    // Apply sorting
    let orderBy;
    // Only allow sorting by valid columns
    const validSortColumns = ["goalId", "name", "goalType", "createdAt"];
    const sortColumn = validSortColumns.includes(sort) ? sort : "createdAt";

    if (order === "asc") {
      if (sortColumn === "goalId") orderBy = asc(goals.goalId);
      else if (sortColumn === "name") orderBy = asc(goals.name);
      else if (sortColumn === "goalType") orderBy = asc(goals.goalType);
      else orderBy = asc(goals.createdAt);
    } else {
      if (sortColumn === "goalId") orderBy = desc(goals.goalId);
      else if (sortColumn === "name") orderBy = desc(goals.name);
      else if (sortColumn === "goalType") orderBy = desc(goals.goalType);
      else orderBy = desc(goals.createdAt);
    }

    // Fetch paginated goals for this site from PostgreSQL
    const siteGoals = await db
      .select()
      .from(goals)
      .where(eq(goals.siteId, Number(siteId)))
      .orderBy(orderBy)
      .limit(pageSizeNumber)
      .offset((pageNumber - 1) * pageSizeNumber);

    if (siteGoals.length === 0) {
      // If no goals for this page, return empty data
      return reply.send({
        data: [],
        meta: {
          total: totalGoals,
          page: pageNumber,
          pageSize: pageSizeNumber,
          totalPages,
        },
      });
    }

    // Build filter and time clauses for ClickHouse queries
    const timeStatement = getTimeStatement(request.query);
    const filterStatement = filters ? getFilterStatement(filters, Number(siteId), timeStatement) : "";

    // First, get the total number of unique sessions (denominator for conversion rate)
    const totalSessionsQuery = `
      SELECT COUNT(DISTINCT session_id) AS total_sessions
      FROM events
      WHERE site_id = ${SqlString.escape(Number(siteId))}
      ${timeStatement}
      ${filterStatement}
    `;

    const totalSessionsResult = await clickhouse.query({
      query: totalSessionsQuery,
      format: "JSONEachRow",
    });

    const totalSessionsData = await processResults<{ total_sessions: number }>(totalSessionsResult);
    const totalSessions = totalSessionsData[0]?.total_sessions || 0;

    // Build a single query that calculates all goal conversions at once using conditional aggregation
    // This is more efficient than separate queries for each goal
    let conditionalClauses: string[] = [];

    for (const goal of siteGoals) {
      if (goal.goalType === "path") {
        const pathPattern = goal.config.pathPattern;
        if (!pathPattern) continue;

        const regex = patternToRegex(pathPattern);
        let pathClause = `type = 'pageview' AND match(pathname, ${SqlString.escape(regex)})`;

        // Support both new propertyFilters array and legacy single property
        const filters = goal.config.propertyFilters || (
          goal.config.eventPropertyKey && goal.config.eventPropertyValue !== undefined
            ? [{ key: goal.config.eventPropertyKey, value: goal.config.eventPropertyValue }]
            : []
        );

        // Add property matching for page goals (URL parameters)
        for (const filter of filters) {
          // Access URL parameters from the url_parameters map
          const propValueAccessor = `url_parameters[${SqlString.escape(filter.key)}]`;

          // URL parameters are stored as strings in the Map
          pathClause += ` AND ${propValueAccessor} = ${SqlString.escape(String(filter.value))}`;
        }

        conditionalClauses.push(`
          COUNT(DISTINCT IF(
            ${pathClause},
            session_id,
            NULL
          )) AS goal_${goal.goalId}_conversions
        `);
      } else if (goal.goalType === "event") {
        const eventName = goal.config.eventName;

        if (!eventName) continue;

        let eventClause = `type = 'custom_event' AND event_name = ${SqlString.escape(eventName)}`;

        // Support both new propertyFilters array and legacy single property
        const filters = goal.config.propertyFilters || (
          goal.config.eventPropertyKey && goal.config.eventPropertyValue !== undefined
            ? [{ key: goal.config.eventPropertyKey, value: goal.config.eventPropertyValue }]
            : []
        );

        // Add property matching if needed
        for (const filter of filters) {
          if (typeof filter.value === "string") {
            eventClause += ` AND JSONExtractString(toString(props), ${SqlString.escape(filter.key)}) = ${SqlString.escape(filter.value)}`;
          } else if (typeof filter.value === "number") {
            eventClause += ` AND toFloat64(JSONExtractString(toString(props), ${SqlString.escape(filter.key)})) = ${SqlString.escape(filter.value)}`;
          } else if (typeof filter.value === "boolean") {
            eventClause += ` AND JSONExtractString(toString(props), ${SqlString.escape(filter.key)}) = ${SqlString.escape(filter.value ? 'true' : 'false')}`;
          }
        }

        conditionalClauses.push(`
          COUNT(DISTINCT IF(
            ${eventClause},
            session_id,
            NULL
          )) AS goal_${goal.goalId}_conversions
        `);
      }
    }

    if (conditionalClauses.length === 0) {
      // If no valid goals to calculate, return the goals without conversion data
      const goalsWithZeroConversions = siteGoals.map(goal => ({
        ...goal,
        total_conversions: 0,
        total_sessions: totalSessions,
        conversion_rate: 0,
      }));

      return reply.send({
        data: goalsWithZeroConversions,
        meta: {
          total: totalGoals,
          page: pageNumber,
          pageSize: pageSizeNumber,
          totalPages,
        },
      });
    }

    // Execute the comprehensive query
    const conversionQuery = `
      SELECT
        ${conditionalClauses.join(", ")}
      FROM events
      WHERE site_id = ${SqlString.escape(Number(siteId))}
      ${timeStatement}
      ${filterStatement}
    `;

    const conversionResult = await clickhouse.query({
      query: conversionQuery,
      format: "JSONEachRow",
    });

    const conversionData = await processResults<Record<string, number>>(conversionResult);

    // If we didn't get any results, use zeros
    const conversions = conversionData[0] || {};

    // Combine goals data with conversion metrics
    const goalsWithConversions: GoalWithConversions[] = siteGoals.map(goal => {
      const totalConversions = conversions[`goal_${goal.goalId}_conversions`] || 0;
      const conversionRate = totalSessions > 0 ? totalConversions / totalSessions : 0;

      return {
        ...goal,
        total_conversions: totalConversions,
        total_sessions: totalSessions,
        conversion_rate: conversionRate,
      };
    });

    return reply.send({
      data: goalsWithConversions,
      meta: {
        total: totalGoals,
        page: pageNumber,
        pageSize: pageSizeNumber,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching goals:", error);
    return reply.status(500).send({ error: "Failed to fetch goals data" });
  }
}
