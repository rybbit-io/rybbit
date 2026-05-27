import { createHash } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { db } from "../../db/postgres/postgres.js";
import {
  featureFlags,
  type FeatureFlagConditionSet,
  type FeatureFlagRule,
  type FeatureFlagRuntime,
  type FeatureFlagType,
  type FeatureFlagVariant,
} from "../../db/postgres/schema.js";
import {
  getCompiledFeatureFlagRegex,
  precompileFeatureFlagConditionSetRegexes,
  precompileFeatureFlagRuleRegexes,
} from "./regex.js";

export type FeatureFlagContext = {
  anonymousId: string;
  identifiedUserId?: string;
  hostname?: string;
  pathname?: string;
  query?: Record<string, string>;
  referrer?: string;
  language?: string;
  country?: string;
  region?: string;
  city?: string;
  deviceType?: string;
  traits?: Record<string, unknown>;
};

export type FeatureFlagAssignment = {
  key: string;
  value: unknown;
  flagType: FeatureFlagType;
  payload?: unknown;
  variant?: string;
  conditionSet?: string;
  version: number;
  reason: "disabled" | "target_mismatch" | "rollout" | "variant" | "remote_config" | "fallthrough";
  matched: boolean;
  rolloutPercentage: number;
};

type FeatureFlagRow = typeof featureFlags.$inferSelect;

function normalizeComparableValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function getContextValue(rule: FeatureFlagRule, context: FeatureFlagContext): unknown {
  switch (rule.field) {
    case "hostname":
      return context.hostname;
    case "pathname":
      return context.pathname;
    case "query":
      return rule.key ? context.query?.[rule.key] : undefined;
    case "referrer":
      return context.referrer;
    case "language":
      return context.language;
    case "country":
      return context.country;
    case "region":
      return context.region;
    case "city":
      return context.city;
    case "device_type":
      return context.deviceType;
    case "user_id":
      return context.identifiedUserId || context.anonymousId;
    case "trait":
      return rule.key ? context.traits?.[rule.key] : undefined;
  }
}

export function bucketPercentage(seed: string): number {
  const hash = createHash("sha256").update(seed).digest("hex");
  const bucket = parseInt(hash.slice(0, 8), 16) / 0xffffffff;
  return bucket * 100;
}

export function matchesFeatureFlagRule(rule: FeatureFlagRule, context: FeatureFlagContext): boolean {
  const actual = normalizeComparableValue(getContextValue(rule, context));
  const expectedValues = Array.isArray(rule.value) ? rule.value : [rule.value];
  const expected = expectedValues.map(normalizeComparableValue);

  switch (rule.operator) {
    case "equals":
      return expected.some(value => actual === value);
    case "not_equals":
      return expected.every(value => actual !== value);
    case "contains":
      return expected.some(value => actual.includes(value));
    case "starts_with":
      return expected.some(value => actual.startsWith(value));
    case "ends_with":
      return expected.some(value => actual.endsWith(value));
    case "regex":
      return expectedValues.some(value => {
        if (typeof value !== "string") return false;
        return getCompiledFeatureFlagRegex(value)?.test(actual) ?? false;
      });
  }
}

function clampPercentage(value: number | undefined, fallback = 100): number {
  return Math.min(100, Math.max(0, value ?? fallback));
}

function getConditionSets(flag: FeatureFlagRow): FeatureFlagConditionSet[] {
  if (Array.isArray(flag.conditionSets) && flag.conditionSets.length > 0) {
    return flag.conditionSets;
  }

  return [
    {
      rules: Array.isArray(flag.rules) ? flag.rules : [],
      rolloutPercentage: flag.rolloutPercentage,
      variants: Array.isArray(flag.variants) ? flag.variants : [],
      payload: flag.payload,
    },
  ];
}

function getConditionSetName(conditionSet: FeatureFlagConditionSet, index: number) {
  return conditionSet.name || `condition_${index + 1}`;
}

function matchesConditionSet(conditionSet: FeatureFlagConditionSet, context: FeatureFlagContext): boolean {
  const rules = Array.isArray(conditionSet.rules) ? conditionSet.rules : [];
  return rules.every(rule => matchesFeatureFlagRule(rule, context));
}

function selectVariant(variants: FeatureFlagVariant[], bucket: number) {
  let cumulativeRollout = 0;

  for (const variant of variants) {
    cumulativeRollout += clampPercentage(variant.rolloutPercentage, 0);
    if (bucket < cumulativeRollout) {
      return {
        variant,
        totalRollout: Math.min(100, cumulativeRollout),
      };
    }
  }

  return {
    variant: undefined,
    totalRollout: Math.min(
      100,
      variants.reduce((sum, variant) => sum + clampPercentage(variant.rolloutPercentage, 0), 0)
    ),
  };
}

function runtimeMatches(flagRuntime: FeatureFlagRuntime, runtime?: FeatureFlagRuntime) {
  if (!runtime) return true;
  if (flagRuntime === "both") return true;
  return flagRuntime === runtime;
}

function getPayload(conditionSet: FeatureFlagConditionSet, flag: FeatureFlagRow) {
  return conditionSet.payload !== undefined ? conditionSet.payload : flag.payload;
}

export function evaluateFeatureFlag(flag: FeatureFlagRow, context: FeatureFlagContext): FeatureFlagAssignment {
  const rolloutPercentage = clampPercentage(flag.rolloutPercentage);
  precompileFeatureFlagRuleRegexes(flag.rules);
  precompileFeatureFlagConditionSetRegexes(flag.conditionSets);

  if (!flag.enabled) {
    return {
      key: flag.key,
      value: false,
      flagType: flag.flagType,
      version: flag.version,
      reason: "disabled",
      matched: false,
      rolloutPercentage,
    };
  }

  const bucket = bucketPercentage(`${flag.siteId}:${flag.key}:${context.anonymousId}:${flag.salt}`);
  const conditionSets = getConditionSets(flag);

  for (let index = 0; index < conditionSets.length; index++) {
    const conditionSet = conditionSets[index];
    if (!matchesConditionSet(conditionSet, context)) {
      continue;
    }

    const conditionSetName = getConditionSetName(conditionSet, index);

    if (flag.flagType === "remote_config") {
      return {
        key: flag.key,
        value: true,
        flagType: flag.flagType,
        payload: getPayload(conditionSet, flag),
        conditionSet: conditionSetName,
        version: flag.version,
        reason: "remote_config",
        matched: true,
        rolloutPercentage: 100,
      };
    }

    if (flag.flagType === "multivariate") {
      const variants =
        Array.isArray(conditionSet.variants) && conditionSet.variants.length > 0
          ? conditionSet.variants
          : Array.isArray(flag.variants)
            ? flag.variants
            : [];
      const selected = selectVariant(variants, bucket);

      if (selected.variant) {
        return {
          key: flag.key,
          value: selected.variant.key,
          flagType: flag.flagType,
          variant: selected.variant.key,
          payload: selected.variant.payload,
          conditionSet: conditionSetName,
          version: flag.version,
          reason: "variant",
          matched: true,
          rolloutPercentage: selected.variant.rolloutPercentage,
        };
      }

      return {
        key: flag.key,
        value: false,
        flagType: flag.flagType,
        conditionSet: conditionSetName,
        version: flag.version,
        reason: "fallthrough",
        matched: false,
        rolloutPercentage: selected.totalRollout,
      };
    }

    const conditionRolloutPercentage = clampPercentage(conditionSet.rolloutPercentage, rolloutPercentage);
    const inRollout =
      conditionRolloutPercentage >= 100 || (conditionRolloutPercentage > 0 && bucket < conditionRolloutPercentage);

    return {
      key: flag.key,
      value: inRollout,
      flagType: flag.flagType,
      payload: inRollout ? getPayload(conditionSet, flag) : undefined,
      conditionSet: conditionSetName,
      version: flag.version,
      reason: inRollout ? "rollout" : "fallthrough",
      matched: inRollout,
      rolloutPercentage: conditionRolloutPercentage,
    };
  }

  return {
    key: flag.key,
    value: false,
    flagType: flag.flagType,
    version: flag.version,
    reason: "target_mismatch",
    matched: false,
    rolloutPercentage,
  };
}

export async function evaluateFeatureFlagsForSite(
  siteId: number,
  context: FeatureFlagContext,
  options: { runtime?: FeatureFlagRuntime } = {}
): Promise<Record<string, FeatureFlagAssignment>> {
  const rows = await db
    .select()
    .from(featureFlags)
    .where(eq(featureFlags.siteId, siteId))
    .orderBy(asc(featureFlags.key));

  const assignments: Record<string, FeatureFlagAssignment> = {};

  for (const flag of rows) {
    if (!runtimeMatches(flag.runtime, options.runtime)) {
      continue;
    }

    assignments[flag.key] = evaluateFeatureFlag(flag, context);
  }

  return assignments;
}
