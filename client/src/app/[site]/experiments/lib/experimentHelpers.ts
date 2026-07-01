import type { Experiment, ExperimentStatus, ExperimentVariantResult } from "@/api/analytics/endpoints";
import { DateTime } from "luxon";

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

export function getLeadingResult(results: ExperimentVariantResult[]): ExperimentVariantResult | undefined {
  return results.reduce<ExperimentVariantResult | undefined>((leader, result) => {
    if (result.conversionRate <= 0) return leader;
    if (!leader || result.conversionRate > leader.conversionRate) return result;
    return leader;
  }, undefined);
}

// Standard normal CDF (Zelen & Severo approximation), accurate to ~7 decimals.
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-(z * z) / 2);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - p : p;
}

// Derive the denominator consistent with the displayed conversion rate so the
// z-test never contradicts the rate shown to the user.
function effectiveSampleSize(result: ExperimentVariantResult): number {
  if (result.conversionRate > 0) {
    const derived = Math.round(result.conversions / result.conversionRate);
    if (Number.isFinite(derived) && derived >= result.conversions) return derived;
  }
  return result.exposures;
}

export type VariantConfidence = {
  confidence: number; // two-sided, 0..1
  isSignificant: boolean; // >= 0.95
};

const MIN_SAMPLE_FOR_STATS = 30;

// Two-proportion z-test of a variant against control. Returns null when there
// isn't enough data to say anything meaningful yet.
export function getVariantConfidence(
  control: ExperimentVariantResult | undefined,
  variant: ExperimentVariantResult
): VariantConfidence | null {
  if (!control || control.variant === variant.variant) return null;

  const nControl = effectiveSampleSize(control);
  const nVariant = effectiveSampleSize(variant);
  if (nControl < MIN_SAMPLE_FOR_STATS || nVariant < MIN_SAMPLE_FOR_STATS) return null;

  const pControl = control.conversions / nControl;
  const pVariant = variant.conversions / nVariant;
  const pPooled = (control.conversions + variant.conversions) / (nControl + nVariant);
  const standardError = Math.sqrt(pPooled * (1 - pPooled) * (1 / nControl + 1 / nVariant));
  if (standardError === 0) return null;

  const z = (pVariant - pControl) / standardError;
  const confidence = 2 * normalCdf(Math.abs(z)) - 1;
  return { confidence, isSignificant: confidence >= 0.95 };
}
