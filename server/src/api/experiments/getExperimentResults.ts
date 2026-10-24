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

type BuildExperimentResultQueriesParams = {
  query: FilterParams;
  siteId: number;
  flagKey: string;
  /** The flag's configured variant keys; must not be empty. */
  variantKeys: string[];
  goalCondition: string;
};

export function buildExperimentResultQueries({
  query,
  siteId,
  flagKey,
  variantKeys,
  goalCondition,
}: BuildExperimentResultQueriesParams) {
  const timeStatement = getTimeStatement(query);
  const filteredSessionsCte = buildFilteredSessionsCTE(query.filters, siteId, timeStatement);
  const filteredSessionsJoin = filteredSessionsCte ? "INNER JOIN FilteredSessions USING (session_id)" : "";
  const filteredSessionsPrefix = filteredSessionsCte ? `${filteredSessionsCte},` : "";
  const escapedSiteId = SqlString.escape(siteId);
  const escapedFlagKey = SqlString.escape(flagKey);
  // Sessions outside the rollout carry the flag as "false"; they are not an experiment arm.
  // Exposures also say why the value was assigned, which tells an arm apart from that "false"
  // even for a variant named "false" (no longer allowed, but older flags may have one).
  const escapedVariantKeys = variantKeys.map(key => SqlString.escape(key)).join(", ");

  // A session qualifies once, independently of which event carried the filter
  // value. Goal, exposure, and assignment rows are then scoped to that cohort.
  const goalSessionsCte = `
      goal_sessions AS (
        SELECT
          session_id,
          max(timestamp) AS last_goal_at
        FROM events
        ${filteredSessionsJoin}
        WHERE site_id = ${escapedSiteId}
          AND (${goalCondition})
          ${timeStatement}
        GROUP BY session_id
      )`;

  // The first observed exposure fixes the experiment arm for the session. A
  // later flag refresh must not count one session in multiple variants.
  const exposureQuery = `
      WITH
        ${filteredSessionsPrefix}
        exposure_sessions AS (
          SELECT
            session_id,
            argMin(JSONExtractString(toString(props), 'value'), timestamp) AS variant,
            min(timestamp) AS exposed_at,
            count() AS exposures
          FROM events
          ${filteredSessionsJoin}
          WHERE site_id = ${escapedSiteId}
            AND type = 'custom_event'
            AND event_name = 'feature_flag_exposure'
            AND JSONExtractString(toString(props), 'key') = ${escapedFlagKey}
            AND JSONExtractString(toString(props), 'value') IN (${escapedVariantKeys})
            AND JSONExtractString(toString(props), 'reason') IN ('variant', '')
            ${timeStatement}
          GROUP BY session_id
        ),
        ${goalSessionsCte}
      SELECT
        e.variant AS variant,
        uniqExact(e.session_id) AS sessions,
        sum(e.exposures) AS exposures,
        uniqExactIf(e.session_id, g.last_goal_at >= e.exposed_at) AS conversions
      FROM exposure_sessions e
      LEFT JOIN goal_sessions g ON g.session_id = e.session_id
      GROUP BY e.variant
      ORDER BY e.variant ASC
    `;

  // Assignment fallback follows the same one-arm-per-session rule, using the
  // first event that carried an assignment for the flag.
  const assignmentQuery = `
      WITH
        ${filteredSessionsPrefix}
        assignment_sessions AS (
          SELECT
            session_id,
            argMin(feature_flags[${escapedFlagKey}], timestamp) AS variant,
            min(timestamp) AS assigned_at
          FROM events
          ${filteredSessionsJoin}
          WHERE site_id = ${escapedSiteId}
            AND feature_flags[${escapedFlagKey}] IN (${escapedVariantKeys})
            ${timeStatement}
          GROUP BY session_id
        ),
        ${goalSessionsCte}
      SELECT
        a.variant AS variant,
        uniqExact(a.session_id) AS sessions,
        uniqExact(a.session_id) AS exposures,
        uniqExactIf(a.session_id, g.last_goal_at >= a.assigned_at) AS conversions
      FROM assignment_sessions a
      LEFT JOIN goal_sessions g ON g.session_id = a.session_id
      GROUP BY a.variant
      ORDER BY a.variant ASC
    `;

  return { assignmentQuery, exposureQuery };
}

export async function getExperimentResults(
  request: FastifyRequest<{
    Params: { siteId: string; experimentId: string };
    Querystring: FilterParams;
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
    const goalCondition = record.primaryGoal ? buildGoalCondition(record.primaryGoal) : null;

    if (!record.primaryGoal || !goalCondition || variants.length === 0) {
      return reply.send({
        data: {
          experiment: serializeExperiment(record),
          variants: buildExperimentResults(variants, []),
          totalExposureSessions: 0,
          totalConversions: 0,
          hasGoal: !!(record.primaryGoal && goalCondition),
          measurement: "exposure",
        },
      });
    }

    const { assignmentQuery, exposureQuery } = buildExperimentResultQueries({
      query: request.query,
      siteId,
      flagKey: record.featureFlag.key,
      variantKeys: variants,
      goalCondition,
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
    const hasExposures = rows.some(row => Number(row.sessions) > 0);
    const hasReservedVariant = variants.some(variant => variant === "true" || variant === "false");
    if (!hasExposures && !hasReservedVariant) {
      const assignmentResult = await clickhouse.query({ query: assignmentQuery, format: "JSONEachRow" });
      const assignmentRows = await processResults<ExperimentResultRow>(assignmentResult);
      if (assignmentRows.some(row => Number(row.sessions) > 0)) {
        rows = assignmentRows;
        measurement = "assignment";
      }
    }

    const variantResults = buildExperimentResults(variants, rows);

    return reply.send({
      data: {
        experiment: serializeExperiment(record),
        variants: variantResults,
        totalExposureSessions: variantResults.reduce((sum, variant) => sum + variant.sessions, 0),
        totalConversions: variantResults.reduce((sum, variant) => sum + variant.conversions, 0),
        hasGoal: true,
        measurement,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: "Validation error", details: error.errors });
    }
    return reply.status(500).send({ error: "Failed to get experiment results" });
  }
}
