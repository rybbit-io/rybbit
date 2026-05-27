import { createHash } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { db } from "../../db/postgres/postgres.js";
import { featureFlags, type FeatureFlagRule, type FeatureFlagType } from "../../db/postgres/schema.js";

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
      return expected.some(value => {
        try {
          return new RegExp(value).test(actual);
        } catch {
          return false;
        }
      });
  }
}

export function evaluateFeatureFlag(flag: FeatureFlagRow, context: FeatureFlagContext): FeatureFlagAssignment {
  const rolloutPercentage = Math.min(100, Math.max(0, flag.rolloutPercentage));

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

  if (flag.flagType === "remote_config") {
    return {
      key: flag.key,
      value: true,
      flagType: flag.flagType,
      payload: flag.payload,
      version: flag.version,
      reason: "remote_config",
      matched: true,
      rolloutPercentage: 100,
    };
  }

  const rules = Array.isArray(flag.rules) ? flag.rules : [];
  const matchesRules = rules.every(rule => matchesFeatureFlagRule(rule, context));

  if (!matchesRules) {
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

  const bucket = bucketPercentage(`${flag.siteId}:${flag.key}:${context.anonymousId}:${flag.salt}`);

  if (flag.flagType === "multivariate") {
    let cumulativeRollout = 0;
    const variants = Array.isArray(flag.variants) ? flag.variants : [];

    for (const variant of variants) {
      cumulativeRollout += Math.min(100, Math.max(0, variant.rolloutPercentage));
      if (bucket < cumulativeRollout) {
        return {
          key: flag.key,
          value: variant.key,
          flagType: flag.flagType,
          variant: variant.key,
          payload: variant.payload,
          version: flag.version,
          reason: "variant",
          matched: true,
          rolloutPercentage: variant.rolloutPercentage,
        };
      }
    }

    return {
      key: flag.key,
      value: false,
      flagType: flag.flagType,
      version: flag.version,
      reason: "fallthrough",
      matched: false,
      rolloutPercentage: Math.min(100, cumulativeRollout),
    };
  }

  const inRollout = rolloutPercentage >= 100 || (rolloutPercentage > 0 && bucket < rolloutPercentage);

  return {
    key: flag.key,
    value: inRollout,
    flagType: flag.flagType,
    payload: inRollout ? flag.payload : undefined,
    version: flag.version,
    reason: inRollout ? "rollout" : "fallthrough",
    matched: inRollout,
    rolloutPercentage,
  };
}

export async function evaluateFeatureFlagsForSite(
  siteId: number,
  context: FeatureFlagContext,
  options: { clientOnly?: boolean } = {}
): Promise<Record<string, FeatureFlagAssignment>> {
  const rows = await db
    .select()
    .from(featureFlags)
    .where(eq(featureFlags.siteId, siteId))
    .orderBy(asc(featureFlags.key));

  const assignments: Record<string, FeatureFlagAssignment> = {};

  for (const flag of rows) {
    if (options.clientOnly !== false && !flag.clientEnabled) {
      continue;
    }

    assignments[flag.key] = evaluateFeatureFlag(flag, context);
  }

  return assignments;
}
