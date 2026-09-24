import { FastifyReply } from "fastify";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/postgres/postgres.js";
import { experiments, featureFlags, goals, type ExperimentStatus } from "../../db/postgres/schema.js";
import type { ExperimentBody } from "./schemas.js";
import type { ExperimentRecord, ExperimentResultRow, ExperimentWithRelations, FeatureFlagRecord } from "./types.js";

export function parseSiteId(siteIdParam: string, reply: FastifyReply): number | null {
  const siteId = parseInt(siteIdParam, 10);
  if (isNaN(siteId) || siteId <= 0) {
    reply.status(400).send({ error: "Invalid site ID" });
    return null;
  }
  return siteId;
}

export function parseExperimentId(experimentIdParam: string, reply: FastifyReply): number | null {
  const experimentId = parseInt(experimentIdParam, 10);
  if (isNaN(experimentId) || experimentId <= 0) {
    reply.status(400).send({ error: "Invalid experiment ID" });
    return null;
  }
  return experimentId;
}

export function getDuplicateExperimentMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
    return "An experiment already exists for this feature flag";
  }
  return null;
}

export async function validateExperimentReferences(
  siteId: number,
  body: Pick<ExperimentBody, "featureFlagId" | "primaryGoalId">
) {
  const [flag, goal] = await Promise.all([
    db.query.featureFlags.findFirst({
      where: and(eq(featureFlags.siteId, siteId), eq(featureFlags.flagId, body.featureFlagId)),
    }),
    body.primaryGoalId
      ? db.query.goals.findFirst({
          where: and(eq(goals.siteId, siteId), eq(goals.goalId, body.primaryGoalId)),
        })
      : Promise.resolve(undefined),
  ]);

  if (!flag) {
    return { error: "Feature flag not found" as const };
  }

  if (flag.flagType !== "multivariate") {
    return { error: "Experiments require a multivariate feature flag" as const };
  }

  if (body.primaryGoalId && !goal) {
    return { error: "Goal not found" as const };
  }

  return { flag, goal };
}

export function timestampsForStatus(status: ExperimentStatus, existing?: ExperimentRecord) {
  const now = new Date().toISOString();
  return {
    startedAt: status === "running" && !existing?.startedAt ? now : undefined,
    endedAt: status === "completed" && !existing?.endedAt ? now : undefined,
  };
}

export async function getExperimentWithRelations(
  siteId: number,
  experimentId: number
): Promise<ExperimentWithRelations | undefined> {
  const [record] = await db
    .select({
      experiment: experiments,
      featureFlag: featureFlags,
      primaryGoal: goals,
    })
    .from(experiments)
    .innerJoin(featureFlags, eq(experiments.featureFlagId, featureFlags.flagId))
    .leftJoin(goals, eq(experiments.primaryGoalId, goals.goalId))
    .where(and(eq(experiments.siteId, siteId), eq(experiments.experimentId, experimentId)));

  return record;
}

export function serializeExperiment(record: ExperimentWithRelations) {
  return {
    ...record.experiment,
    featureFlag: record.featureFlag,
    primaryGoal: record.primaryGoal,
  };
}

export function getExperimentVariantKeys(flag: FeatureFlagRecord) {
  const variantKeys: string[] = [];

  for (const conditionSet of flag.conditionSets || []) {
    for (const variant of conditionSet.variants || []) {
      if (!variantKeys.includes(variant.key)) {
        variantKeys.push(variant.key);
      }
    }
  }

  for (const variant of flag.variants || []) {
    if (!variantKeys.includes(variant.key)) {
      variantKeys.push(variant.key);
    }
  }

  return variantKeys;
}

function getControlVariant(variants: string[], rows: ExperimentResultRow[]) {
  return variants.find(variant => variant === "control") || variants[0] || rows[0]?.variant || null;
}

export function buildExperimentResults(variants: string[], rows: ExperimentResultRow[]) {
  const resultMap = new Map(rows.map(row => [row.variant, row]));
  const allVariants = [...variants];

  for (const row of rows) {
    if (!allVariants.includes(row.variant)) {
      allVariants.push(row.variant);
    }
  }

  const controlVariant = getControlVariant(allVariants, rows);
  const controlRow = controlVariant ? resultMap.get(controlVariant) : undefined;
  const controlRate = controlRow && controlRow.sessions > 0 ? controlRow.conversions / controlRow.sessions : null;

  return allVariants.map(variant => {
    const row = resultMap.get(variant);
    const sessions = row?.sessions ?? 0;
    const exposures = row?.exposures ?? 0;
    const conversions = row?.conversions ?? 0;
    const conversionRate = sessions > 0 ? conversions / sessions : 0;
    const lift = controlRate && controlRate > 0 ? (conversionRate - controlRate) / controlRate : null;

    return {
      variant,
      sessions,
      exposures,
      conversions,
      conversionRate,
      lift,
      isControl: variant === controlVariant,
    };
  });
}
