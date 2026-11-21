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

// A session's events count toward one unit: the visitor id seen anywhere in that session, or else
// the session itself. Events from a tracker that didn't send visitor_id yet (cached older script)
// still land on the same unit as the rest of their session.
export const EXPERIMENT_UNIT = "ifNull(nullIf(session_visitor, ''), events.session_id)";

export type ExperimentResultsQuery = FilterParams<{ window?: "experiment" | "range" }>;

export type ExperimentWindow = { mode: "experiment" | "range"; start: string | null; end: string | null };

type ExperimentDates = { startedAt: string | null; endedAt: string | null };

/** The run's exact bounds (UTC, milliseconds), applied to timestamp_ms on top of the whole-second window. */
export type ExactWindow = { start: string; end: string | null };

function parseUtc(value: string | Date): Date {
  return typeof value === "string" ? new Date(`${value.replace(" ", "T")}Z`) : value;
}

function toWindowInstant(value: string | Date, roundUp = false): string {
  const date = parseUtc(value);
  const ms = roundUp ? Math.ceil(date.getTime() / 1000) * 1000 : Math.floor(date.getTime() / 1000) * 1000;
  return new Date(ms).toISOString().slice(0, 19).replace("T", " ");
}

function toExactInstant(value: string): string {
  return parseUtc(value).toISOString().slice(0, 23).replace("T", " ");
}

export function resolveExperimentWindow(
  query: ExperimentResultsQuery,
  experiment: ExperimentDates,
  now = new Date()
): { query: FilterParams; window: ExperimentWindow; exact: ExactWindow | null } {
  if (query.window === "range" || !experiment.startedAt) {
    return {
      query,
      window: { mode: "range", start: query.start_date || null, end: query.end_date || null },
      exact: null,
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
    exact: {
      start: toExactInstant(experiment.startedAt),
      end: experiment.endedAt ? toExactInstant(experiment.endedAt) : null,
    },
  };
}

type BuildExperimentResultQueriesParams = {
  query: FilterParams;
  siteId: number;
  flagKey: string;
  /** The flag's configured variant keys; must not be empty. */
  variantKeys: string[];
  goalCondition: string;
  exact?: ExactWindow | null;
};

export function buildExperimentResultQueries({
  query,
  siteId,
  flagKey,
  variantKeys,
  goalCondition,
  exact,
}: BuildExperimentResultQueriesParams) {
  // The whole-second window prunes by the (site_id, timestamp) sort key; the exact bounds then
  // keep events from the run's first and last second that fall outside it.
  const windowStatement = getTimeStatement(query);
  const timeStatement = `${windowStatement}${
    exact
      ? `
            AND timestamp_ms >= toDateTime64(${SqlString.escape(exact.start)}, 3, 'UTC')${
              exact.end ? ` AND timestamp_ms <= toDateTime64(${SqlString.escape(exact.end)}, 3, 'UTC')` : ""
            }`
      : ""
  }`;
  const filteredSessionsCte = buildFilteredSessionsCTE(query.filters, siteId, windowStatement);
  const filteredSessionsJoin = filteredSessionsCte ? "INNER JOIN FilteredSessions USING (session_id)" : "";
  const filteredSessionsPrefix = filteredSessionsCte ? `${filteredSessionsCte},` : "";
  const escapedSiteId = SqlString.escape(siteId);
  const escapedFlagKey = SqlString.escape(flagKey);
  // Sessions outside the rollout carry the flag as "false"; they are not an experiment arm.
  // Exposures also say why the value was assigned, which tells an arm apart from that "false"
  // even for a variant named "false" (no longer allowed, but older flags may have one).
  const escapedVariantKeys = variantKeys.map(key => SqlString.escape(key)).join(", ");
  const timeZone = SqlString.escape(query.time_zone || "UTC");
  const sessionVisitorJoin = "LEFT JOIN session_visitors ON session_visitors.visitor_session_id = events.session_id";

  const sessionVisitorsCte = `
        session_visitors AS (
          SELECT session_id AS visitor_session_id, any(visitor_id) AS session_visitor
          FROM events
          WHERE site_id = ${escapedSiteId}
            AND visitor_id != ''
            ${timeStatement}
          GROUP BY session_id
        )`;

  const unitsCte = (measurement: "exposure" | "assignment") =>
    measurement === "exposure"
      ? `
        experiment_units AS (
          SELECT
            ${EXPERIMENT_UNIT} AS unit,
            argMin(JSONExtractString(toString(props), 'value'), timestamp_ms) AS variant,
            min(timestamp_ms) AS exposed_at,
            groupUniqArray(events.session_id) AS session_ids,
            count() AS exposures
          FROM events
          ${filteredSessionsJoin}
          ${sessionVisitorJoin}
          WHERE site_id = ${escapedSiteId}
            AND type = 'custom_event'
            AND event_name = 'feature_flag_exposure'
            AND JSONExtractString(toString(props), 'key') = ${escapedFlagKey}
            AND JSONExtractString(toString(props), 'value') IN (${escapedVariantKeys})
            AND JSONExtractString(toString(props), 'reason') IN ('variant', '')
            ${timeStatement}
          GROUP BY unit
        )`
      : `
        experiment_units AS (
          SELECT
            ${EXPERIMENT_UNIT} AS unit,
            argMin(feature_flags[${escapedFlagKey}], timestamp_ms) AS variant,
            min(timestamp_ms) AS exposed_at,
            groupUniqArray(events.session_id) AS session_ids,
            1 AS exposures
          FROM events
          ${filteredSessionsJoin}
          ${sessionVisitorJoin}
          WHERE site_id = ${escapedSiteId}
            AND feature_flags[${escapedFlagKey}] IN (${escapedVariantKeys})
            ${timeStatement}
          GROUP BY unit
        )`;

  const goalEventsCte = `
        goal_events AS (
          SELECT
            ${EXPERIMENT_UNIT} AS unit,
            timestamp_ms AS goal_at
          FROM events
          ${filteredSessionsJoin}
          ${sessionVisitorJoin}
          WHERE site_id = ${escapedSiteId}
            AND (${goalCondition})
            ${timeStatement}
        )`;

  const resultsQuery = (measurement: "exposure" | "assignment") => `
      WITH
        ${filteredSessionsPrefix}
        ${sessionVisitorsCte},
        ${unitsCte(measurement)},
        ${goalEventsCte},
        goal_units AS (
          SELECT unit, max(goal_at) AS last_goal_at FROM goal_events GROUP BY unit
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
        ${sessionVisitorsCte},
        ${unitsCte(measurement)},
        ${goalEventsCte},
        unit_outcomes AS (
          SELECT
            u.unit AS unit,
            any(u.variant) AS variant,
            any(u.exposed_at) AS exposed_at,
            minIf(g.goal_at, g.goal_at >= u.exposed_at) AS converted_at
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
    const { query, window, exact } = resolveExperimentWindow(request.query, record.experiment);
    const goalCondition = record.primaryGoal ? buildGoalCondition(record.primaryGoal) : null;

    if (!record.primaryGoal || !goalCondition || variants.length === 0) {
      return reply.send({
        data: {
          experiment: serializeExperiment(record),
          variants: buildExperimentResults(variants, []),
          totalUnits: 0,
          totalExposureSessions: 0,
          totalConversions: 0,
          hasGoal: !!(record.primaryGoal && goalCondition),
          measurement: "exposure",
          window,
        },
      });
    }

    const { assignmentQuery, exposureQuery } = buildExperimentResultQueries({
      query,
      siteId,
      flagKey: record.featureFlag.key,
      variantKeys: variants,
      goalCondition,
      exact,
    });

    const exposureResult = await clickhouse.query({ query: exposureQuery, format: "JSONEachRow" });
    let rows = await processResults<ExperimentResultRow>(exposureResult);
    let measurement: "exposure" | "assignment" = "exposure";

    // Fallback: if no exposures were recorded (the app never calls rybbit.flag
    // for this key), count sessions that were assigned the variant via the
    // feature_flags map attached to every event. Looser, but avoids a confusing
    // empty result when the flag is clearly assigning traffic.
    // The assignment map can't tell a variant named "true"/"false" (older flags may have one)
    // from the flag being on or off for a visitor outside the rollout, so such flags only
    // report exposures.
    const hasExposures = rows.some(row => Number(row.units) > 0);
    const hasReservedVariant = variants.some(variant => variant === "true" || variant === "false");
    if (!hasExposures && !hasReservedVariant) {
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
