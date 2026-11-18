import { describe, it, expect } from "vitest";
import { precompileFeatureFlagRegexPattern, validateFeatureFlagRegexPattern } from "./regex.js";

describe("validateFeatureFlagRegexPattern", () => {
  it("accepts a plain valid pattern", () => {
    expect(validateFeatureFlagRegexPattern("^/pricing")).toBeNull();
    expect(validateFeatureFlagRegexPattern("foo|bar")).toBeNull();
    expect(validateFeatureFlagRegexPattern("[a-z]+\\d{2}")).toBeNull();
  });

  it("rejects an empty pattern", () => {
    expect(validateFeatureFlagRegexPattern("")).toBe("Regex pattern cannot be empty");
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
  it("compiles a pattern that actually matches", () => {
    const compiled = precompileFeatureFlagRegexPattern("^/pricing");
    expect(compiled!.test("/pricing/pro")).toBe(true);
    expect(compiled!.test("/docs")).toBe(false);
  });

  it("refuses every pattern validation rejects", () => {
    for (const pattern of ["", "[invalid", "(a+)+", "a".repeat(300)]) {
      expect(precompileFeatureFlagRegexPattern(pattern)).toBeUndefined();
    }
  });
});
