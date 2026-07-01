import safeRegex from "safe-regex2";
import type { FeatureFlagConditionSet, FeatureFlagRule } from "../../db/postgres/schema.js";

const MAX_REGEX_PATTERN_LENGTH = 256;
const MAX_REGEX_REPETITIONS = 25;
const MAX_REGEX_CACHE_SIZE = 1000;

const compiledRegexCache = new Map<string, RegExp>();
const invalidRegexCache = new Set<string>();

export function validateFeatureFlagRegexPattern(pattern: string): string | null {
  if (!pattern) {
    return "Regex pattern cannot be empty";
  }

  if (pattern.length > MAX_REGEX_PATTERN_LENGTH) {
    return `Regex pattern cannot exceed ${MAX_REGEX_PATTERN_LENGTH} characters`;
  }

  try {
    new RegExp(pattern);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return `Invalid regex pattern: ${message}`;
  }

  if (!safeRegex(pattern, { limit: MAX_REGEX_REPETITIONS })) {
    return "Regex pattern is too complex";
  }

  return null;
}

export function precompileFeatureFlagRegexPattern(pattern: string): RegExp | undefined {
  const cached = compiledRegexCache.get(pattern);
  if (cached) {
    return cached;
  }

  if (invalidRegexCache.has(pattern)) {
    return undefined;
  }

  if (validateFeatureFlagRegexPattern(pattern)) {
    invalidRegexCache.add(pattern);
    return undefined;
  }

  const compiled = new RegExp(pattern);

  if (compiledRegexCache.size >= MAX_REGEX_CACHE_SIZE) {
    const firstKey = compiledRegexCache.keys().next().value;
    if (firstKey) {
      compiledRegexCache.delete(firstKey);
    }
  }

  compiledRegexCache.set(pattern, compiled);
  return compiled;
}

export function getCompiledFeatureFlagRegex(pattern: string): RegExp | undefined {
  return compiledRegexCache.get(pattern);
}

export function precompileFeatureFlagRuleRegexes(rules: FeatureFlagRule[] | undefined): void {
  if (!Array.isArray(rules)) return;

  for (const rule of rules) {
    if (rule.operator !== "regex") continue;

    const values = Array.isArray(rule.value) ? rule.value : [rule.value];
    for (const value of values) {
      if (typeof value === "string") {
        precompileFeatureFlagRegexPattern(value);
      }
    }
  }
}

export function precompileFeatureFlagConditionSetRegexes(conditionSets: FeatureFlagConditionSet[] | undefined): void {
  if (!Array.isArray(conditionSets)) return;

  for (const conditionSet of conditionSets) {
    precompileFeatureFlagRuleRegexes(conditionSet.rules);
  }
}
