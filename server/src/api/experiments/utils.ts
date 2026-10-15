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

// Exposures, event tags and visitor ids all come from the tracking script,
// which only receives client-evaluated flags.
export const SERVER_ONLY_FLAG_ERROR =
  "Experiments need a flag evaluated on the client. Server-only flags aren't sent to the tracking script, so no exposures would be recorded.";

export function experimentFlagError(flag: Pick<FeatureFlagRecord, "flagType" | "runtime">) {
  if (flag.flagType !== "multivariate") return "Experiments require a multivariate feature flag";
  if (flag.runtime === "server") return SERVER_ONLY_FLAG_ERROR;
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

  const flagError = experimentFlagError(flag);
  if (flagError) {
    return { error: flagError };
  }

  if (body.primaryGoalId && !goal) {
    return { error: "Goal not found" as const };
  }

  return { flag, goal };
}

/**
 * Changes an update may not make once an experiment is under way: its flag's
 * assignment and the rollout are only kept in step at the status transitions.
 */
export function experimentUpdateError(
  existing: Pick<ExperimentRecord, "status" | "featureFlagId" | "winningVariant">,
  body: Partial<Pick<ExperimentBody, "status" | "featureFlagId" | "winningVariant">>
) {
  if (existing.status === "completed" && body.status !== undefined && body.status !== "completed") {
    return "A completed experiment can't be reopened: its flag now serves the rolled-out variant. Start a new experiment to test again.";
  }
  if (existing.status !== "draft" && body.featureFlagId !== undefined && body.featureFlagId !== existing.featureFlagId) {
    return "The flag can't change once the experiment has started, because visitors are already assigned. Start a new experiment to test a different flag.";
  }
  const isCompleting = body.status === "completed" && existing.status !== "completed";
  const winner = body.winningVariant === undefined ? undefined : body.winningVariant?.trim() || null;
  if (!isCompleting && winner !== undefined && winner !== existing.winningVariant) {
    return "The winning variant is chosen when completing the experiment.";
  }
  return null;
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
  const controlUnits = Number(controlRow?.units ?? 0);
  const controlRate = controlUnits > 0 ? Number(controlRow?.conversions ?? 0) / controlUnits : null;

  return allVariants.map(variant => {
    const row = resultMap.get(variant);
    const units = Number(row?.units ?? 0);
    const sessions = Number(row?.sessions ?? 0);
    const exposures = Number(row?.exposures ?? 0);
    const conversions = Number(row?.conversions ?? 0);
    const conversionRate = units > 0 ? conversions / units : 0;
    const lift = controlRate && controlRate > 0 ? (conversionRate - controlRate) / controlRate : null;

    return {
      variant,
      units,
      sessions,
      exposures,
      conversions,
      conversionRate,
      lift,
      isControl: variant === controlVariant,
    };
  });
}

export function rolloutWinner(flag: FeatureFlagRecord, winner: string) {
  const serveWinner = <T extends { key: string; rolloutPercentage: number }>(variants: T[] | null | undefined) =>
    (variants || []).map(variant => ({ ...variant, rolloutPercentage: variant.key === winner ? 100 : 0 }));

  return {
    rolloutPercentage: 100,
    variants: serveWinner(flag.variants),
    conditionSets: (flag.conditionSets || []).map(conditionSet =>
      conditionSet.variants?.length
        ? { ...conditionSet, rolloutPercentage: 100, variants: serveWinner(conditionSet.variants) }
        : { ...conditionSet, rolloutPercentage: 100 }
    ),
  };
}

export function flagUpdateForStatusChange(
  from: ExperimentStatus,
  to: ExperimentStatus,
  flag: FeatureFlagRecord,
  winner?: string
): Partial<FeatureFlagRecord> | null {
  if (from === to) return null;
  if (to === "completed") return winner ? { ...rolloutWinner(flag, winner), enabled: true } : null;

  const enabled = to === "paused" ? false : to === "running" ? true : undefined;
  return enabled === undefined || flag.enabled === enabled ? null : { enabled };
}
