import { describe, expect, it } from "vitest";
import type { FeatureFlagRule } from "../../db/postgres/schema.js";
import {
  getCompiledFeatureFlagRegex,
  precompileFeatureFlagConditionSetRegexes,
  precompileFeatureFlagRegexPattern,
  precompileFeatureFlagRuleRegexes,
  validateFeatureFlagRegexPattern,
} from "./regex.js";

// The module keeps a process-wide compile cache, so each test uses a unique
// pattern to stay independent of the others.

describe("validateFeatureFlagRegexPattern", () => {
  it("rejects an empty pattern", () => {
    expect(validateFeatureFlagRegexPattern("")).toBe(
      "Regex pattern cannot be empty",
    );
  });

  it("rejects a pattern longer than the limit", () => {
    expect(validateFeatureFlagRegexPattern("a".repeat(257))).toContain(
      "cannot exceed",
    );
  });

  it("rejects a syntactically invalid pattern", () => {
    expect(validateFeatureFlagRegexPattern("(unterminated")).toContain(
      "Invalid regex pattern",
    );
  });

  it("rejects a catastrophic backtracking pattern as too complex", () => {
    expect(validateFeatureFlagRegexPattern("(a+)+$")).toBe(
      "Regex pattern is too complex",
    );
  });

  it("accepts a safe pattern", () => {
    expect(validateFeatureFlagRegexPattern("^/blog/[0-9]+$")).toBeNull();
  });
});

describe("precompileFeatureFlagRegexPattern", () => {
  it("compiles a valid pattern and caches it for later lookup", () => {
    const pattern = "^/precompile-valid/[a-z]+$";
    expect(getCompiledFeatureFlagRegex(pattern)).toBeUndefined();

    const compiled = precompileFeatureFlagRegexPattern(pattern);
    expect(compiled).toBeInstanceOf(RegExp);
    expect(compiled?.test("/precompile-valid/abc")).toBe(true);
    expect(getCompiledFeatureFlagRegex(pattern)).toBe(compiled);
  });

  it("returns the same cached instance on a second call", () => {
    const pattern = "^/precompile-cache/[a-z]+$";
    const first = precompileFeatureFlagRegexPattern(pattern);
    const second = precompileFeatureFlagRegexPattern(pattern);
    expect(second).toBe(first);
  });

  it("returns undefined for an invalid pattern without caching it", () => {
    const pattern = "(also-unterminated";
    expect(precompileFeatureFlagRegexPattern(pattern)).toBeUndefined();
    expect(getCompiledFeatureFlagRegex(pattern)).toBeUndefined();
  });
});

describe("precompileFeatureFlagRuleRegexes", () => {
  const rule = (over: Partial<FeatureFlagRule>): FeatureFlagRule => ({
    field: "pathname",
    operator: "regex",
    value: "^/default$",
    ...over,
  });

  it("precompiles the pattern of a regex rule", () => {
    const pattern = "^/rule-regex/[0-9]+$";
    precompileFeatureFlagRuleRegexes([rule({ value: pattern })]);
    expect(getCompiledFeatureFlagRegex(pattern)).toBeInstanceOf(RegExp);
  });

  it("precompiles every entry when the value is an array", () => {
    const first = "^/rule-array-first$";
    const second = "^/rule-array-second$";
    precompileFeatureFlagRuleRegexes([rule({ value: [first, second] })]);
    expect(getCompiledFeatureFlagRegex(first)).toBeInstanceOf(RegExp);
    expect(getCompiledFeatureFlagRegex(second)).toBeInstanceOf(RegExp);
  });

  it("skips rules whose operator is not regex", () => {
    const pattern = "^/rule-skip/[0-9]+$";
    precompileFeatureFlagRuleRegexes([
      rule({ operator: "equals", value: pattern }),
    ]);
    expect(getCompiledFeatureFlagRegex(pattern)).toBeUndefined();
  });

  it("is a no-op when the rule list is missing", () => {
    expect(() => precompileFeatureFlagRuleRegexes(undefined)).not.toThrow();
  });
});

describe("precompileFeatureFlagConditionSetRegexes", () => {
  it("precompiles the regex rules inside every condition set", () => {
    const pattern = "^/conditionset/[0-9]+$";
    precompileFeatureFlagConditionSetRegexes([
      { rules: [{ field: "pathname", operator: "regex", value: pattern }] },
    ]);
    expect(getCompiledFeatureFlagRegex(pattern)).toBeInstanceOf(RegExp);
  });

  it("is a no-op when the condition set list is missing", () => {
    expect(() =>
      precompileFeatureFlagConditionSetRegexes(undefined),
    ).not.toThrow();
  });
});
