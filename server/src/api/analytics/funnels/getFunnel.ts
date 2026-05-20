import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import SqlString from "sqlstring";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { getTimeStatement, patternToRegex, processResults } from "../utils/utils.js";
import { getFilterStatement } from "../utils/getFilterStatement.js";

type FunnelStep = {
  value: string;
  name?: string;
  type: "page" | "event";
  hostname?: string;
  // Deprecated fields - kept for backwards compatibility
  eventPropertyKey?: string;
  eventPropertyValue?: string | number | boolean;
  // New field for multiple property filters
  propertyFilters?: Array<{
    key: string;
    value: string | number | boolean;
  }>;
};

type Funnel = {
  steps: FunnelStep[];
};

type FunnelResponse = {
  step_number: number;
  step_name: string;
  visitors: number;
  conversion_rate: number;
  dropoff_rate: number;
};

export async function getFunnel(
  request: FastifyRequest<{
    Body: Funnel;
    Params: {
      siteId: string;
    };
    Querystring: FilterParams<{}>;
  }>,
  reply: FastifyReply
) {
  const { steps } = request.body;
  const { siteId } = request.params;

  // Validate request
  if (!steps || steps.length < 2) {
    return reply.status(400).send({ error: "At least 2 steps are required for a funnel" });
  }

  try {
    const timeStatement = getTimeStatement(request.query);
    const filterStatement = getFilterStatement(request.query.filters, Number(siteId), timeStatement);

    // Build conditional statements for each step
    const stepConditions = steps.map(step => {
      let condition = "";

      if (step.type === "page") {
        // Use pattern matching for page paths to support wildcards
        const regex = patternToRegex(step.value);
        // Manually escape single quotes in the regex and wrap in quotes
        // Don't use SqlString.escape() as it doesn't preserve the regex correctly
        const safeRegex = regex.replace(/'/g, "\\'");
        condition = `type = 'pageview' AND match(pathname, '${safeRegex}')`;

        // Support both new propertyFilters array and legacy single property
        const filters = step.propertyFilters || (
          step.eventPropertyKey && step.eventPropertyValue !== undefined
            ? [{ key: step.eventPropertyKey, value: step.eventPropertyValue }]
            : []
        );

        // Add property matching for page steps (URL parameters)
        for (const filter of filters) {
          // Access URL parameters from the url_parameters map
          const propValueAccessor = `url_parameters[${SqlString.escape(filter.key)}]`;

          // URL parameters are stored as strings in the Map
          condition += ` AND ${propValueAccessor} = ${SqlString.escape(String(filter.value))}`;
        }
      } else {
        // Start with the base event match condition
        condition = `type = 'custom_event' AND event_name = ${SqlString.escape(step.value)}`;

        // Support both new propertyFilters array and legacy single property
        const filters = step.propertyFilters || (
          step.eventPropertyKey && step.eventPropertyValue !== undefined
            ? [{ key: step.eventPropertyKey, value: step.eventPropertyValue }]
            : []
        );

        // Add property matching if both key and value are provided
        for (const filter of filters) {
          if (typeof filter.value === "string") {
            condition += ` AND JSONExtractString(toString(props), ${SqlString.escape(filter.key)}) = ${SqlString.escape(filter.value)}`;
          } else if (typeof filter.value === "number") {
            condition += ` AND toFloat64(JSONExtractString(toString(props), ${SqlString.escape(filter.key)})) = ${SqlString.escape(filter.value)}`;
          } else if (typeof filter.value === "boolean") {
            condition += ` AND JSONExtractString(toString(props), ${SqlString.escape(filter.key)}) = ${SqlString.escape(filter.value ? 'true' : 'false')}`;
          }
        }
      }

      // Add hostname filtering if specified
      if (step.hostname) {
        condition += ` AND hostname = ${SqlString.escape(step.hostname)}`;
      }

      return condition;
    });

    // Build the funnel query - session-based tracking
    const query = `
    WITH
    -- Get all session actions in the time period
    SessionActions AS (
      SELECT
        session_id,
        timestamp,
        pathname,
        event_name,
        type,
        props,
        hostname,
        url_parameters
      FROM events
      WHERE
        site_id = {siteId:Int32}
        ${timeStatement}
        ${filterStatement}
    ),
    -- Initial step (all sessions who completed step 1)
    Step1 AS (
      SELECT DISTINCT
        session_id,
        min(timestamp) as step_time
      FROM SessionActions
      WHERE ${stepConditions[0]}
      GROUP BY session_id
    )

    -- Calculate each funnel step
    ${steps
      .slice(1)
      .map(
        (step, index) => `
    , Step${index + 2} AS (
      SELECT DISTINCT
        s${index + 1}.session_id,
        min(sa.timestamp) as step_time
      FROM Step${index + 1} s${index + 1}
      JOIN SessionActions sa ON s${index + 1}.session_id = sa.session_id
      WHERE
        sa.timestamp > s${index + 1}.step_time
        AND ${stepConditions[index + 1]}
      GROUP BY s${index + 1}.session_id
    )
    `
      )
      .join("")}

    -- Calculate visitor count for each step
    , StepCounts AS (
      ${steps
        .map(
          (step, index) => `
          SELECT
            ${index + 1} as step_number,
            ${SqlString.escape(step.name || step.value)} as step_name,
            count(DISTINCT session_id) as visitors
          FROM Step${index + 1}
        `
        )
        .join("\nUNION ALL\n")}
    )
    
    -- Final results with calculated conversion and dropoff rates
    SELECT
      s1.step_number,
      s1.step_name,
      s1.visitors as visitors,
      round(s1.visitors * 100.0 / first_step.visitors, 2) as conversion_rate,
      CASE 
        WHEN s1.step_number = 1 THEN 0
        ELSE round((1 - (s1.visitors / prev_step.visitors)) * 100.0, 2)
      END as dropoff_rate
    FROM StepCounts s1
    CROSS JOIN (SELECT visitors FROM StepCounts WHERE step_number = 1) as first_step
    LEFT JOIN (
      SELECT step_number + 1 as next_step_number, visitors
      FROM StepCounts
      WHERE step_number < {stepNumber:Int32}
    ) as prev_step ON s1.step_number = prev_step.next_step_number
    ORDER BY s1.step_number
    `;

    // Execute the query
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteId: Number(siteId),
        stepNumber: steps.length,
      },
    });

    // Process the results
    const data = await processResults<FunnelResponse>(result);
    return reply.send({ data });
  } catch (error) {
    console.error("Error executing funnel query:", error);
    return reply.status(500).send({ error: "Failed to execute funnel analysis" });
  }
}
