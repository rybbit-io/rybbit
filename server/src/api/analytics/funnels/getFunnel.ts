import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import SqlString from "sqlstring";
import { getTimeStatement } from "../utils/timeWindow.js";
import { AnalyticsQueryError, runAnalyticsQuery } from "../utils/analyticsQuery.js";
import { buildFilteredSessionsCTE } from "../utils/sessionFilters.js";
import { buildFunnelStepCondition, FunnelStep } from "./funnelSteps.js";

type Funnel = {
  steps: FunnelStep[];
};

type FunnelResponse = {
  step_number: number;
  step_name: string;
  /** Sessions that reached this step. Funnels are session-scoped, not person-scoped. */
  sessions: number;
  conversion_rate: number;
  dropoff_rate: number;
};

export const buildFunnelQuery = (query: FilterParams<{}>, siteId: number, steps: FunnelStep[]) => {
  const timeStatement = getTimeStatement(query);
  const filteredSessionsCTE = buildFilteredSessionsCTE(query.filters, siteId, timeStatement);

  // Build conditional statements for each step
  const stepConditions = steps.map(step => buildFunnelStepCondition(step));

  // Build the funnel query - session-based tracking
  return `
    WITH
    ${filteredSessionsCTE ? `${filteredSessionsCTE},` : ""}
    -- Get all session actions in the time period
    SessionActions AS (
      SELECT
        session_id,
        timestamp_ms AS timestamp,
        pathname,
        event_name,
        type,
        props,
        hostname,
        url_parameters
      FROM events
      ${filteredSessionsCTE ? "INNER JOIN FilteredSessions USING (session_id)" : ""}
      WHERE
        site_id = {siteId:Int32}
        ${timeStatement}
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
            count(DISTINCT session_id) as sessions
          FROM Step${index + 1}
        `
        )
        .join("\nUNION ALL\n")}
    )

    -- Final results with calculated conversion and dropoff rates
    SELECT
      s1.step_number,
      s1.step_name,
      s1.sessions as sessions,
      round(s1.sessions * 100.0 / first_step.sessions, 2) as conversion_rate,
      CASE
        WHEN s1.step_number = 1 THEN 0
        ELSE round((1 - (s1.sessions / prev_step.sessions)) * 100.0, 2)
      END as dropoff_rate
    FROM StepCounts s1
    CROSS JOIN (SELECT sessions FROM StepCounts WHERE step_number = 1) as first_step
    LEFT JOIN (
      SELECT step_number + 1 as next_step_number, sessions
      FROM StepCounts
      WHERE step_number < {stepNumber:Int32}
    ) as prev_step ON s1.step_number = prev_step.next_step_number
    ORDER BY s1.step_number
    `;
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
    const data = await runAnalyticsQuery<FunnelResponse>({
      query: buildFunnelQuery(request.query, Number(siteId), steps),
      params: {
        siteId: Number(siteId),
        stepNumber: steps.length,
      },
    });

    // `visitors` is the pre-rename name of `sessions`, kept so existing API and
    // MCP consumers don't break. Deprecated: drop once consumers have migrated.
    return reply.send({ data: data.map(step => ({ ...step, visitors: step.sessions })) });
  } catch (error) {
    if (error instanceof AnalyticsQueryError) {
      request.log.error({ err: error.original }, "Error executing funnel query");
      for (const query of error.queries) {
        request.log.debug({ query }, "Failed funnel query");
      }
    } else {
      request.log.error({ err: error }, "Error executing funnel query");
    }
    return reply.status(500).send({ error: "Failed to execute funnel analysis" });
  }
}
