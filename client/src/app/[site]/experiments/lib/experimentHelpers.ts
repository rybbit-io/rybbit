import { compareToControl, projectedScaleToDecide, sampleRatioMismatch, type VariantStats } from "@rybbit/shared";
import { DateTime } from "luxon";

import type { Experiment, ExperimentStatus, ExperimentVariantResult } from "@/api/analytics/endpoints";

export type ExperimentFormState = {
  name: string;
  description: string;
  hypothesis: string;
  featureFlagId: string;
  primaryGoalId: string;
  status: ExperimentStatus;
};

export const STATUS_OPTIONS: ExperimentStatus[] = ["draft", "running", "paused", "completed"];

export const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;

// A posterior is never certain, so near-0 and near-100 values keep a bound
// instead of rounding to a claim of certainty.
export function formatBoundedPercent(value: number, digits: number) {
  const floor = 10 ** -digits;
  const percent = value * 100;
  if (percent > 0 && percent < floor) return `<${floor.toFixed(digits)}`;
  if (percent > 100 - floor) return `>${(100 - floor).toFixed(digits)}`;
  return percent.toFixed(digits);
}

export function getVariantKeys(experiment: Experiment) {
  const keys: string[] = [];

  for (const conditionSet of experiment.featureFlag.conditionSets || []) {
    for (const variant of conditionSet.variants || []) {
      if (!keys.includes(variant.key)) keys.push(variant.key);
    }
  }

  for (const variant of experiment.featureFlag.variants || []) {
    if (!keys.includes(variant.key)) keys.push(variant.key);
  }

  return keys;
}

export function toFormState(experiment?: Experiment, fallbackFlagId?: number): ExperimentFormState {
  return {
    name: experiment?.name || "",
    description: experiment?.description || "",
    hypothesis: experiment?.hypothesis || "",
    featureFlagId: String(experiment?.featureFlagId ?? fallbackFlagId ?? ""),
    primaryGoalId: experiment?.primaryGoalId ? String(experiment.primaryGoalId) : "none",
    status: experiment?.status || "draft",
  };
}

export function statusLabel(status: ExperimentStatus) {
  const labels: Record<ExperimentStatus, string> = {
    draft: "Draft",
    running: "Running",
    paused: "Paused",
    completed: "Completed",
  };
  return labels[status];
}

export function formatCompactNumber(value: number): string {
  if (value < 1000) return value.toLocaleString();
  if (value < 1_000_000) return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)}k`;
  return `${(value / 1_000_000).toFixed(1)}M`;
}

export function formatRelativeTime(iso: string | null): string | null {
  if (!iso) return null;
  const dt = DateTime.fromISO(iso);
  return dt.isValid ? dt.toRelative() : null;
}

export function getControlResult(results: ExperimentVariantResult[]): ExperimentVariantResult | undefined {
  return results.find(result => result.isControl) || results[0];
}

export function getVariantStats(
  control: ExperimentVariantResult | undefined,
  variant: ExperimentVariantResult
): VariantStats | null {
  if (!control || control.variant === variant.variant) return null;
  return compareToControl(
    { units: control.units, conversions: control.conversions },
    { units: variant.units, conversions: variant.conversions }
  );
}

type VariantSplit = { key: string; rolloutPercentage: number }[];

function getVariantSplits(experiment: Experiment): VariantSplit[] {
  const flagVariants = experiment.featureFlag.variants || [];
  const conditionSets = experiment.featureFlag.conditionSets || [];
  const splits = conditionSets.map(conditionSet =>
    conditionSet.variants?.length ? conditionSet.variants : flagVariants
  );
  if (conditionSets.length === 0) splits.push(flagVariants);
  return splits.filter(split => split.length > 0);
}

export function getVariantWeights(experiment: Experiment): Record<string, number> | null {
  const splits = getVariantSplits(experiment);
  if (splits.length === 0) return null;

  const toWeights = (variants: VariantSplit) =>
    Object.fromEntries(variants.map(variant => [variant.key, Number(variant.rolloutPercentage) || 0]));
  const [first, ...rest] = splits.map(toWeights);
  const sameSplit = rest.every(
    weights =>
      Object.keys(weights).length === Object.keys(first).length &&
      Object.entries(weights).every(([key, weight]) => first[key] === weight)
  );
  return sameSplit ? first : null;
}

export function getServedVariants(experiment: Experiment): Set<string> {
  return new Set(
    getVariantSplits(experiment).flatMap(split =>
      split.filter(variant => (Number(variant.rolloutPercentage) || 0) > 0).map(variant => variant.key)
    )
  );
}

export const MIN_UNITS_PER_VARIANT = 100;
export const MIN_CONVERSIONS = 10;

export function hasEnoughData(results: ExperimentVariantResult[], servedVariants?: Set<string>) {
  const served = servedVariants?.size ? results.filter(result => servedVariants.has(result.variant)) : results;
  return (
    served.length > 1 &&
    served.every(result => result.units >= MIN_UNITS_PER_VARIANT) &&
    results.reduce((sum, result) => sum + result.conversions, 0) >= MIN_CONVERSIONS
  );
}

export function getExperimentVerdict(experiment: Experiment, results: ExperimentVariantResult[]) {
  const control = getControlResult(results);
  const enoughData = hasEnoughData(
    results,
    experiment.status === "completed" ? undefined : getServedVariants(experiment)
  );
  const statsByVariant = new Map(
    results.map(result => [result.variant, enoughData ? getVariantStats(control, result) : null])
  );
  const comparisons = results.flatMap(result => {
    const stats = statsByVariant.get(result.variant);
    return stats ? [{ result, stats }] : [];
  });
  const winning = comparisons
    .filter(comparison => comparison.stats.decision === "winning")
    .sort((a, b) => b.stats.chanceToBeatControl - a.stats.chanceToBeatControl)[0];
  const controlWinning =
    !!control && comparisons.length > 0 && comparisons.every(comparison => comparison.stats.decision === "losing");

  const weights = getVariantWeights(experiment);
  const srm = weights
    ? sampleRatioMismatch(
        results.map(result => result.units),
        results.map(result => weights[result.variant] ?? 0)
      )
    : null;
  const leader = srm?.mismatch ? undefined : (winning?.result ?? (controlWinning ? control : undefined));

  const totalUnits = results.reduce((sum, result) => sum + result.units, 0);
  const scales = leader || !control ? [] : comparisons.map(({ result }) => projectedScaleToDecide(control, result));
  const nearestScale = Math.min(...scales.filter((scale): scale is number => scale !== null));
  const remainingUnits = Number.isFinite(nearestScale) ? Math.ceil(totalUnits * (nearestScale - 1)) : null;

  return { control, enoughData, statsByVariant, comparisons, weights, srm, leader, remainingUnits };
}
