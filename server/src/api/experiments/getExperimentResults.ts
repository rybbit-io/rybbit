import { FastifyReply, FastifyRequest } from "fastify";
import type { FilterParams } from "@rybbit/shared";
import SqlString from "sqlstring";
import { z } from "zod";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { buildGoalCondition } from "../analytics/goals/goalConditions.js";
import { buildFilteredSessionsCTE } from "../analytics/utils/sessionFilters.js";
import { processResults } from "../analytics/utils/utils.js";
import { getTimeStatement } from "../analytics/utils/timeWindow.js";
import type { ExperimentResultRow } from "./types.js";
import {
  buildExperimentResults,
  getExperimentVariantKeys,
  getExperimentWithRelations,
  parseExperimentId,
  parseSiteId,
  serializeExperiment,
} from "./utils.js";

export const EXPERIMENT_UNIT = "if(visitor_id != '', visitor_id, session_id)";

const UNASSIGNED_VALUES = "'', 'false'";

export type ExperimentResultsQuery = FilterParams<{ window?: "experiment" | "range" }>;

export type ExperimentWindow = { mode: "experiment" | "range"; start: string | null; end: string | null };

type ExperimentDates = { startedAt: string | null; endedAt: string | null };

function toWindowInstant(value: string | Date, roundUp = false): string {
  const date = typeof value === "string" ? new Date(`${value.replace(" ", "T")}Z`) : value;
  const ms = roundUp ? Math.ceil(date.getTime() / 1000) * 1000 : Math.floor(date.getTime() / 1000) * 1000;
  return new Date(ms).toISOString().slice(0, 19).replace("T", " ");
}

export function resolveExperimentWindow(
  query: ExperimentResultsQuery,
  experiment: ExperimentDates,
  now = new Date()
): { query: FilterParams; window: ExperimentWindow } {
  if (query.window === "range" || !experiment.startedAt) {
    return {
      query,
      window: { mode: "range", start: query.start_date || null, end: query.end_date || null },
    };
  }

  const start = toWindowInstant(experiment.startedAt);
  const end = experiment.endedAt
    ? toWindowInstant(experiment.endedAt, true)
    : toWindowInstant(new Date(now.getTime() + 1000), true);

  return {
    query: {
      ...query,
      start_date: "",
      end_date: "",
      past_minutes_start: undefined,
      past_minutes_end: undefined,
      start_datetime: start,
      end_datetime: end,
    },
    window: { mode: "experiment", start, end: experiment.endedAt ? end : null },
  };
}

type BuildExperimentResultQueriesParams = {
  query: FilterParams;
  siteId: number;
  flagKey: string;
  goalCondition: string;
};

export function buildExperimentResultQueries({
  query,
  siteId,
  flagKey,
  goalCondition,
}: BuildExperimentResultQueriesParams) {
  const timeStatement = getTimeStatement(query);
  const filteredSessionsCte = buildFilteredSessionsCTE(query.filters, siteId, timeStatement);
  const filteredSessionsJoin = filteredSessionsCte ? "INNER JOIN FilteredSessions USING (session_id)" : "";
  const filteredSessionsPrefix = filteredSessionsCte ? `${filteredSessionsCte},` : "";
  const escapedSiteId = SqlString.escape(siteId);
  const escapedFlagKey = SqlString.escape(flagKey);
  const timeZone = SqlString.escape(query.time_zone || "UTC");

  const unitsCte = (measurement: "exposure" | "assignment") =>
    measurement === "exposure"
      ? `
        experiment_units AS (
          SELECT
            ${EXPERIMENT_UNIT} AS unit,
            argMin(JSONExtractString(toString(props), 'value'), timestamp) AS variant,
            min(timestamp) AS exposed_at,
            groupUniqArray(session_id) AS session_ids,
            count() AS exposures
          FROM events
          ${filteredSessionsJoin}
          WHERE site_id = ${escapedSiteId}
            AND type = 'custom_event'
            AND event_name = 'feature_flag_exposure'
            AND JSONExtractString(toString(props), 'key') = ${escapedFlagKey}
            AND JSONExtractString(toString(props), 'value') NOT IN (${UNASSIGNED_VALUES})
            ${timeStatement}
          GROUP BY unit
        )`
      : `
        experiment_units AS (
          SELECT
            ${EXPERIMENT_UNIT} AS unit,
            argMin(feature_flags[${escapedFlagKey}], timestamp) AS variant,
            min(timestamp) AS exposed_at,
            groupUniqArray(session_id) AS session_ids,
            1 AS exposures
          FROM events
          ${filteredSessionsJoin}
          WHERE site_id = ${escapedSiteId}
            AND feature_flags[${escapedFlagKey}] NOT IN (${UNASSIGNED_VALUES})
            ${timeStatement}
          GROUP BY unit
        )`;

  const goalEventsCte = `
        goal_events AS (
          SELECT
            ${EXPERIMENT_UNIT} AS unit,
            timestamp
          FROM events
          ${filteredSessionsJoin}
          WHERE site_id = ${escapedSiteId}
            AND (${goalCondition})
            ${timeStatement}
        )`;

  const resultsQuery = (measurement: "exposure" | "assignment") => `
      WITH
        ${filteredSessionsPrefix}
        ${unitsCte(measurement)},
        ${goalEventsCte},
        goal_units AS (
          SELECT unit, max(timestamp) AS last_goal_at FROM goal_events GROUP BY unit
        )
      SELECT
        u.variant AS variant,
        uniqExact(u.unit) AS units,
        uniqExactArray(u.session_ids) AS sessions,
        sum(u.exposures) AS exposures,
        uniqExactIf(u.unit, g.last_goal_at >= u.exposed_at) AS conversions
      FROM experiment_units u
      LEFT JOIN goal_units g ON g.unit = u.unit
      GROUP BY u.variant
      ORDER BY u.variant ASC
    `;

  const timeseriesQuery = (measurement: "exposure" | "assignment") => `
      WITH
        ${filteredSessionsPrefix}
        ${unitsCte(measurement)},
        ${goalEventsCte},
        unit_outcomes AS (
          SELECT
            u.unit AS unit,
            any(u.variant) AS variant,
            any(u.exposed_at) AS exposed_at,
            minIf(g.timestamp, g.timestamp >= u.exposed_at) AS converted_at
          FROM experiment_units u
          LEFT JOIN goal_events g ON g.unit = u.unit
          GROUP BY u.unit
        )
      SELECT
        variant,
        toString(day) AS day,
        sum(new_units) AS units,
        sum(new_conversions) AS conversions
      FROM (
        SELECT variant, toDate(exposed_at, ${timeZone}) AS day, 1 AS new_units, 0 AS new_conversions FROM unit_outcomes
        UNION ALL
        SELECT variant, toDate(converted_at, ${timeZone}) AS day, 0 AS new_units, 1 AS new_conversions
        FROM unit_outcomes
        WHERE converted_at > toDateTime(0)
      )
      GROUP BY variant, day
      ORDER BY day ASC, variant ASC
    `;

  return {
    exposureQuery: resultsQuery("exposure"),
    assignmentQuery: resultsQuery("assignment"),
    exposureTimeseriesQuery: timeseriesQuery("exposure"),
    assignmentTimeseriesQuery: timeseriesQuery("assignment"),
  };
}

export async function getExperimentResults(
  request: FastifyRequest<{
    Params: { siteId: string; experimentId: string };
    Querystring: ExperimentResultsQuery;
  }>,
  reply: FastifyReply
) {
  try {
    const siteId = parseSiteId(request.params.siteId, reply);
    if (!siteId) return;

    const experimentId = parseExperimentId(request.params.experimentId, reply);
    if (!experimentId) return;

    const record = await getExperimentWithRelations(siteId, experimentId);
    if (!record) {
      return reply.status(404).send({ error: "Experiment not found" });
    }

    const variants = getExperimentVariantKeys(record.featureFlag);
    const { query, window } = resolveExperimentWindow(request.query, record.experiment);
    const goalCondition = record.primaryGoal ? buildGoalCondition(record.primaryGoal) : null;

    if (!record.primaryGoal || !goalCondition) {
      return reply.send({
        data: {
          experiment: serializeExperiment(record),
          variants: buildExperimentResults(variants, []),
          totalUnits: 0,
          totalExposureSessions: 0,
          totalConversions: 0,
          hasGoal: false,
          measurement: "exposure",
          window,
        },
      });
    }

    const { assignmentQuery, exposureQuery } = buildExperimentResultQueries({
      query,
      siteId,
      flagKey: record.featureFlag.key,
      goalCondition,
    });

    const exposureResult = await clickhouse.query({ query: exposureQuery, format: "JSONEachRow" });
    let rows = await processResults<ExperimentResultRow>(exposureResult);
    let measurement: "exposure" | "assignment" = "exposure";

    // Fallback: if no exposures were recorded (the app never calls rybbit.flag
    // for this key), count sessions that were assigned the variant via the
    // feature_flags map attached to every event. Looser, but avoids a confusing
    // empty result when the flag is clearly assigning traffic.
    const hasExposures = rows.some(row => Number(row.units) > 0);
    if (!hasExposures) {
      const assignmentResult = await clickhouse.query({ query: assignmentQuery, format: "JSONEachRow" });
      const assignmentRows = await processResults<ExperimentResultRow>(assignmentResult);
      if (assignmentRows.some(row => Number(row.units) > 0)) {
        rows = assignmentRows;
        measurement = "assignment";
      }
    }

    const variantResults = buildExperimentResults(variants, rows);

    return reply.send({
      data: {
        experiment: serializeExperiment(record),
        variants: variantResults,
        totalUnits: variantResults.reduce((sum, variant) => sum + variant.units, 0),
        totalExposureSessions: variantResults.reduce((sum, variant) => sum + variant.sessions, 0),
        totalConversions: variantResults.reduce((sum, variant) => sum + variant.conversions, 0),
        hasGoal: true,
        measurement,
        window,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: "Validation error", details: error.errors });
    }
    return reply.status(500).send({ error: "Failed to get experiment results" });
  }
}
