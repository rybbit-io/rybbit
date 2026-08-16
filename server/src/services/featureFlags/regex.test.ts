import { describe, it, expect } from "vitest";
import type { FeatureFlagConditionSet, FeatureFlagRule } from "../../db/postgres/schema.js";
import {
  getCompiledFeatureFlagRegex,
  precompileFeatureFlagConditionSetRegexes,
  precompileFeatureFlagRegexPattern,
  precompileFeatureFlagRuleRegexes,
  validateFeatureFlagRegexPattern,
} from "./regex.js";

// The compile caches live at module scope, so every test uses a pattern unique
// to itself and cache-visibility assertions never collide across tests.
let uniqueCounter = 0;
const uniquePattern = (body = "ok") => `^${body}-unique-${process.pid}-${uniqueCounter++}$`;

describe("validateFeatureFlagRegexPattern", () => {
  it("accepts a plain valid pattern", () => {
    expect(validateFeatureFlagRegexPattern("^/pricing")).toBeNull();
    expect(validateFeatureFlagRegexPattern("foo|bar")).toBeNull();
    expect(validateFeatureFlagRegexPattern("[a-z]+\\d{2}")).toBeNull();
  });

  it("rejects an empty pattern", () => {
    expect(validateFeatureFlagRegexPattern("")).toBe("Regex pattern cannot be empty");
  });

  it("accepts a whitespace-only pattern (it is truthy and parses)", () => {
    expect(validateFeatureFlagRegexPattern(" ")).toBeNull();
  });

  it("rejects a pattern over the 256 character limit", () => {
    expect(validateFeatureFlagRegexPattern("a".repeat(256))).toBeNull();
    expect(validateFeatureFlagRegexPattern("a".repeat(257))).toBe("Regex pattern cannot exceed 256 characters");
  });

  it("checks length before parseability", () => {
    // An over-long AND unparseable pattern reports the length error.
    expect(validateFeatureFlagRegexPattern("[" + "a".repeat(300))).toBe("Regex pattern cannot exceed 256 characters");
  });

  it("rejects an unparseable pattern and includes the engine message", () => {
    const error = validateFeatureFlagRegexPattern("[invalid");
    expect(error).toMatch(/^Invalid regex pattern: /);
    expect(error).toContain("Unterminated character class");
  });

  it("rejects other malformed patterns", () => {
    expect(validateFeatureFlagRegexPattern("(unclosed")).toMatch(/^Invalid regex pattern: /);
    expect(validateFeatureFlagRegexPattern("a{2,1}")).toMatch(/^Invalid regex pattern: /);
    expect(validateFeatureFlagRegexPattern("*")).toMatch(/^Invalid regex pattern: /);
  });

  it("rejects catastrophic-backtracking patterns as too complex", () => {
    expect(validateFeatureFlagRegexPattern("(a+)+$")).toBe("Regex pattern is too complex");
    expect(validateFeatureFlagRegexPattern("^(x+x+)+y$")).toBe("Regex pattern is too complex");
    expect(validateFeatureFlagRegexPattern("(a{2,3}){2,3}")).toBe("Regex pattern is too complex");
  });

  it("allows up to 25 repetition operators and rejects 26", () => {
    expect(validateFeatureFlagRegexPattern("a*".repeat(25))).toBeNull();
    expect(validateFeatureFlagRegexPattern("a*".repeat(26))).toBe("Regex pattern is too complex");
  });

  it("does not reject a nested-quantifier-free alternation", () => {
    expect(validateFeatureFlagRegexPattern("(a|a)*$")).toBeNull();
  });
});

describe("precompileFeatureFlagRegexPattern", () => {
  it("returns a RegExp for a valid pattern", () => {
    const pattern = uniquePattern();
    const compiled = precompileFeatureFlagRegexPattern(pattern);
    expect(compiled).toBeInstanceOf(RegExp);
    expect(compiled!.source).toBe(pattern);
    expect(compiled!.flags).toBe("");
  });

  it("compiles a pattern that actually matches", () => {
    const compiled = precompileFeatureFlagRegexPattern("^/pricing");
    expect(compiled!.test("/pricing/pro")).toBe(true);
    expect(compiled!.test("/docs")).toBe(false);
  });

  it("returns undefined for an empty pattern", () => {
    expect(precompileFeatureFlagRegexPattern("")).toBeUndefined();
  });

  it("returns undefined for an invalid pattern", () => {
    expect(precompileFeatureFlagRegexPattern("[invalid-" + uniqueCounter++)).toBeUndefined();
  });

  it("returns undefined for a too-complex pattern", () => {
    expect(precompileFeatureFlagRegexPattern("(a+)+" + uniqueCounter++)).toBeUndefined();
  });

  it("returns undefined for an over-long pattern", () => {
    expect(precompileFeatureFlagRegexPattern("a".repeat(300))).toBeUndefined();
  });

  it("returns the identical cached instance on repeat calls", () => {
    const pattern = uniquePattern("cached");
    const first = precompileFeatureFlagRegexPattern(pattern);
    const second = precompileFeatureFlagRegexPattern(pattern);
    expect(first).toBe(second);
  });

  it("keeps distinct patterns as distinct instances", () => {
    const a = precompileFeatureFlagRegexPattern(uniquePattern("a"));
    const b = precompileFeatureFlagRegexPattern(uniquePattern("b"));
    expect(a).not.toBe(b);
  });

  it("keeps returning undefined for a pattern it has already rejected", () => {
    const bad = "(bad+)+" + uniqueCounter++;
    expect(precompileFeatureFlagRegexPattern(bad)).toBeUndefined();
    expect(precompileFeatureFlagRegexPattern(bad)).toBeUndefined();
    expect(getCompiledFeatureFlagRegex(bad)).toBeUndefined();
  });
});

describe("getCompiledFeatureFlagRegex", () => {
  it("returns undefined before the pattern has been precompiled", () => {
    const pattern = uniquePattern("notyet");
    expect(getCompiledFeatureFlagRegex(pattern)).toBeUndefined();
  });

  it("returns the cached instance after precompiling", () => {
    const pattern = uniquePattern("lookup");
    const compiled = precompileFeatureFlagRegexPattern(pattern);
    expect(getCompiledFeatureFlagRegex(pattern)).toBe(compiled);
  });

  it("never compiles on demand — it is a pure cache read", () => {
    const pattern = uniquePattern("lazy");
    expect(getCompiledFeatureFlagRegex(pattern)).toBeUndefined();
    // A second read still misses; only precompile populates the cache.
    expect(getCompiledFeatureFlagRegex(pattern)).toBeUndefined();
  });

  it("returns undefined for an invalid pattern even after a precompile attempt", () => {
    const bad = "[nope-" + uniqueCounter++;
    precompileFeatureFlagRegexPattern(bad);
    expect(getCompiledFeatureFlagRegex(bad)).toBeUndefined();
  });
});

describe("precompileFeatureFlagRuleRegexes", () => {
  it("does nothing for undefined rules", () => {
    expect(() => precompileFeatureFlagRuleRegexes(undefined)).not.toThrow();
  });

  it("does nothing for an empty rule list", () => {
    expect(() => precompileFeatureFlagRuleRegexes([])).not.toThrow();
  });

  it("tolerates a non-array value", () => {
    expect(() => precompileFeatureFlagRuleRegexes({} as unknown as FeatureFlagRule[])).not.toThrow();
    expect(() => precompileFeatureFlagRuleRegexes(null as unknown as FeatureFlagRule[])).not.toThrow();
  });

  it("precompiles a single-value regex rule", () => {
    const pattern = uniquePattern("rule");
    precompileFeatureFlagRuleRegexes([{ field: "pathname", operator: "regex", value: pattern }]);
    expect(getCompiledFeatureFlagRegex(pattern)).toBeInstanceOf(RegExp);
  });

  it("precompiles every value of an array-valued regex rule", () => {
    const a = uniquePattern("arr-a");
    const b = uniquePattern("arr-b");
    precompileFeatureFlagRuleRegexes([{ field: "pathname", operator: "regex", value: [a, b] }]);
    expect(getCompiledFeatureFlagRegex(a)).toBeInstanceOf(RegExp);
    expect(getCompiledFeatureFlagRegex(b)).toBeInstanceOf(RegExp);
  });

  it("skips rules whose operator is not regex", () => {
    const pattern = uniquePattern("notregex");
    precompileFeatureFlagRuleRegexes([{ field: "pathname", operator: "equals", value: pattern }]);
    expect(getCompiledFeatureFlagRegex(pattern)).toBeUndefined();
  });

  it("skips non-string values inside a regex rule", () => {
    expect(() =>
      precompileFeatureFlagRuleRegexes([{ field: "pathname", operator: "regex", value: [1, true] }])
    ).not.toThrow();
    expect(getCompiledFeatureFlagRegex("1")).toBeUndefined();
    expect(getCompiledFeatureFlagRegex("true")).toBeUndefined();
  });

  it("precompiles across several rules and ignores invalid patterns", () => {
    const good = uniquePattern("multi");
    const bad = "(bad+)+" + uniqueCounter++;
    precompileFeatureFlagRuleRegexes([
      { field: "pathname", operator: "regex", value: good },
      { field: "country", operator: "equals", value: "US" },
      { field: "referrer", operator: "regex", value: bad },
    ]);
    expect(getCompiledFeatureFlagRegex(good)).toBeInstanceOf(RegExp);
    expect(getCompiledFeatureFlagRegex(bad)).toBeUndefined();
  });

  it("shares one cache entry when two rules use the same pattern", () => {
    const pattern = uniquePattern("shared");
    precompileFeatureFlagRuleRegexes([
      { field: "pathname", operator: "regex", value: pattern },
      { field: "referrer", operator: "regex", value: pattern },
    ]);
    expect(getCompiledFeatureFlagRegex(pattern)).toBe(precompileFeatureFlagRegexPattern(pattern));
  });
});

describe("precompileFeatureFlagConditionSetRegexes", () => {
  it("does nothing for undefined condition sets", () => {
    expect(() => precompileFeatureFlagConditionSetRegexes(undefined)).not.toThrow();
  });

  it("does nothing for an empty condition set list", () => {
    expect(() => precompileFeatureFlagConditionSetRegexes([])).not.toThrow();
  });

  it("tolerates a non-array value", () => {
    expect(() => precompileFeatureFlagConditionSetRegexes({} as unknown as FeatureFlagConditionSet[])).not.toThrow();
  });

  it("precompiles the regex rules of every condition set", () => {
    const a = uniquePattern("cs-a");
    const b = uniquePattern("cs-b");
    const sets = [
      { rules: [{ field: "pathname", operator: "regex", value: a }] },
      { rules: [{ field: "referrer", operator: "regex", value: b }] },
    ] as FeatureFlagConditionSet[];

    precompileFeatureFlagConditionSetRegexes(sets);
    expect(getCompiledFeatureFlagRegex(a)).toBeInstanceOf(RegExp);
    expect(getCompiledFeatureFlagRegex(b)).toBeInstanceOf(RegExp);
  });

  it("tolerates a condition set with no rules", () => {
    expect(() =>
      precompileFeatureFlagConditionSetRegexes([{ rules: [] } as unknown as FeatureFlagConditionSet])
    ).not.toThrow();
    expect(() => precompileFeatureFlagConditionSetRegexes([{} as unknown as FeatureFlagConditionSet])).not.toThrow();
  });

  it("skips non-regex operators inside condition sets", () => {
    const pattern = uniquePattern("cs-equals");
    precompileFeatureFlagConditionSetRegexes([
      { rules: [{ field: "pathname", operator: "equals", value: pattern }] },
    ] as FeatureFlagConditionSet[]);
    expect(getCompiledFeatureFlagRegex(pattern)).toBeUndefined();
  });
});
