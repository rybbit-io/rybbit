import { FastifyReply, FastifyRequest } from "fastify";
import type { FilterParams } from "@rybbit/shared";
import SqlString from "sqlstring";
import { z } from "zod";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { buildGoalCondition } from "../analytics/goals/goalConditions.js";
import { getFilterStatement } from "../analytics/utils/getFilterStatement.js";
import { getTimeStatement, processResults } from "../analytics/utils/utils.js";
import type { ExperimentResultRow } from "./types.js";
import {
  buildExperimentResults,
  getExperimentVariantKeys,
  getExperimentWithRelations,
  parseExperimentId,
  parseSiteId,
  serializeExperiment,
} from "./utils.js";

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

    if (!record.primaryGoal || !goalCondition) {
      return reply.send({
        data: {
          experiment: serializeExperiment(record),
          variants: buildExperimentResults(variants, []),
          totalExposureSessions: 0,
          totalConversions: 0,
          hasGoal: false,
          measurement: "exposure",
        },
      });
    }

    const timeStatement = getTimeStatement(request.query);
    const filterStatement = request.query.filters
      ? getFilterStatement(request.query.filters as string, siteId, timeStatement)
      : "";
    const escapedSiteId = SqlString.escape(siteId);
    const escapedFlagKey = SqlString.escape(record.featureFlag.key);

    // One row per session that completed the goal, scoped to the same time
    // window and filters the goals page uses, so experiment conversions can
    // never exceed the goal's own count. Aggregating per session also keeps the
    // join below one-to-one, so exposure counts aren't inflated.
    const goalSessionsCte = `
      goal_sessions AS (
        SELECT
          session_id,
          max(timestamp) AS last_goal_at
        FROM events
        WHERE site_id = ${escapedSiteId}
          AND (${goalCondition})
          ${timeStatement}
          ${filterStatement}
        GROUP BY session_id
      )`;

    // Exposure-based: counts only sessions that explicitly read the flag via
    // rybbit.flag(), which emits a feature_flag_exposure event. This is the
    // statistically correct unit of analysis for an experiment.
    const exposureQuery = `
        WITH
          exposure_sessions AS (
            SELECT
              session_id,
              JSONExtractString(toString(props), 'value') AS variant,
              min(timestamp) AS exposed_at,
              count() AS exposures
            FROM events
            WHERE site_id = ${escapedSiteId}
              AND type = 'custom_event'
              AND event_name = 'feature_flag_exposure'
              AND JSONExtractString(toString(props), 'key') = ${escapedFlagKey}
              AND JSONExtractString(toString(props), 'value') != ''
              ${timeStatement}
              ${filterStatement}
            GROUP BY session_id, variant
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

    const exposureResult = await clickhouse.query({ query: exposureQuery, format: "JSONEachRow" });
    let rows = await processResults<ExperimentResultRow>(exposureResult);
    let measurement: "exposure" | "assignment" = "exposure";

    // Fallback: if no exposures were recorded (the app never calls rybbit.flag
    // for this key), count sessions that were assigned the variant via the
    // feature_flags map attached to every event. Looser, but avoids a confusing
    // empty result when the flag is clearly assigning traffic.
    const hasExposures = rows.some(row => Number(row.sessions) > 0);
    if (!hasExposures) {
      const assignmentQuery = `
        WITH
          assignment_sessions AS (
            SELECT
              session_id,
              feature_flags[${escapedFlagKey}] AS variant,
              min(timestamp) AS assigned_at
            FROM events
            WHERE site_id = ${escapedSiteId}
              AND feature_flags[${escapedFlagKey}] != ''
              ${timeStatement}
              ${filterStatement}
            GROUP BY session_id, variant
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
