import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import SqlString from "sqlstring";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { getTimeStatement, patternToRegex, processResults } from "../utils/utils.js";
import { GetSessionsResponse } from "../getSessions.js";
import { getFilterStatement } from "../utils/getFilterStatement.js";

type FunnelStep = {
  value: string;
  name?: string;
  type: "page" | "event";
  hostname?: string;
  eventPropertyKey?: string;
  eventPropertyValue?: string | number | boolean;
};

type Funnel = {
  steps: FunnelStep[];
};

export interface GetFunnelStepSessionsRequest {
  Body: Funnel;
  Params: {
    site: string;
    stepNumber: string;
  };
  Querystring: FilterParams<{
    mode: "reached" | "dropped";
    limit?: number;
    page: number;
  }>;
}

export async function getFunnelStepSessions(req: FastifyRequest<GetFunnelStepSessionsRequest>, res: FastifyReply) {
  const { steps } = req.body;
  const { stepNumber: stepNumberStr, site } = req.params;
  const { mode, page, limit } = req.query;

  const stepNumber = parseInt(stepNumberStr, 10);

  // Validate request
  if (!steps || steps.length < 2) {
    return res.status(400).send({ error: "At least 2 steps are required for a funnel" });
  }

  if (isNaN(stepNumber) || stepNumber < 1 || stepNumber > steps.length) {
    return res.status(400).send({ error: "Invalid step number" });
  }

  if (mode !== "reached" && mode !== "dropped") {
    return res.status(400).send({ error: "Mode must be 'reached' or 'dropped'" });
  }

  // For final step in "dropped" mode, return empty results (no drop-off possible)
  if (mode === "dropped" && stepNumber === steps.length) {
    return res.send({ data: [] });
  }

  try {
    const timeStatement = getTimeStatement(req.query);
    let filterStatement = getFilterStatement(req.query.filters, Number(site), timeStatement);

    // Transform filter statement to use extracted UTM columns instead of map access
    // since the CTE already extracts utm_source, utm_medium, etc. as separate columns
    filterStatement = filterStatement
      .replace(/url_parameters\['utm_source'\]/g, "utm_source")
      .replace(/url_parameters\['utm_medium'\]/g, "utm_medium")
      .replace(/url_parameters\['utm_campaign'\]/g, "utm_campaign")
      .replace(/url_parameters\['utm_term'\]/g, "utm_term")
      .replace(/url_parameters\['utm_content'\]/g, "utm_content");

    // Build conditional statements for each step we need
    const stepsToCheck = mode === "reached" ? stepNumber : stepNumber + 1;
    const stepConditions = steps.slice(0, stepsToCheck).map((step, idx) => {
      let condition = "";

      if (step.type === "page") {
        const regex = patternToRegex(step.value);
        condition = `type = 'pageview' AND match(pathname, ${SqlString.escape(regex)})`;
      } else {
        condition = `type = 'custom_event' AND event_name = ${SqlString.escape(step.value)}`;

        if (step.eventPropertyKey && step.eventPropertyValue !== undefined) {
          const propValueAccessor = `props.${SqlString.escapeId(step.eventPropertyKey)}`;

          if (typeof step.eventPropertyValue === "string") {
            condition += ` AND toString(${propValueAccessor}) = ${SqlString.escape(step.eventPropertyValue)}`;
          } else if (typeof step.eventPropertyValue === "number") {
            condition += ` AND toFloat64OrNull(${propValueAccessor}) = ${SqlString.escape(step.eventPropertyValue)}`;
          } else if (typeof step.eventPropertyValue === "boolean") {
            condition += ` AND toUInt8OrNull(${propValueAccessor}) = ${step.eventPropertyValue ? 1 : 0}`;
          }
        }
      }

      if (step.hostname) {
        condition += ` AND hostname = ${SqlString.escape(step.hostname)}`;
      }

      return condition;
    });

    // Build CTEs for each funnel step to identify qualifying sessions
    const stepCTEs = [
      `
    SessionActions AS (
      SELECT
        session_id,
        timestamp,
        pathname,
        event_name,
        type,
        props,
        hostname
      FROM events
      WHERE
        site_id = {siteId:Int32}
        ${timeStatement}
        ${filterStatement}
    ),
    Step1 AS (
      SELECT DISTINCT
        session_id,
        min(timestamp) as step_time
      FROM SessionActions
      WHERE ${stepConditions[0]}
      GROUP BY session_id
    )`,
    ];

    // Add CTEs for steps 2 through stepNumber (and +1 for dropped mode)
    for (let i = 1; i < stepsToCheck; i++) {
      stepCTEs.push(`
    Step${i + 1} AS (
      SELECT DISTINCT
        s${i}.session_id,
        min(sa.timestamp) as step_time
      FROM Step${i} s${i}
      JOIN SessionActions sa ON s${i}.session_id = sa.session_id
      WHERE
        sa.timestamp > s${i}.step_time
        AND ${stepConditions[i]}
      GROUP BY s${i}.session_id
    )`);
    }

    // Determine which sessions to retrieve
    let targetSessionsCTE = "";
    if (mode === "reached") {
      // Sessions that completed step N
      targetSessionsCTE = `
    TargetSessions AS (
      SELECT session_id
      FROM Step${stepNumber}
    )`;
    } else {
      // Sessions that completed step N but NOT step N+1
      targetSessionsCTE = `
    TargetSessions AS (
      SELECT session_id
      FROM Step${stepNumber}
      WHERE session_id NOT IN (
        SELECT session_id
        FROM Step${stepNumber + 1}
      )
    )`;
    }

    // Build main query to aggregate session data
    const query = `
    WITH
    ${stepCTEs.join(",\n")}
    ,
    ${targetSessionsCTE}
    ,
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
      INNER JOIN TargetSessions ts ON e.session_id = ts.session_id
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
    WHERE 1 = 1 ${filterStatement}
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
    console.error("Error fetching funnel step sessions:", error);
    return res.status(500).send({ error: "Failed to fetch funnel step sessions" });
  }
}
