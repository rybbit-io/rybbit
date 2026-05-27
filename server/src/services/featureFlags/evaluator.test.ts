import { describe, expect, it } from "vitest";
import { bucketPercentage, evaluateFeatureFlag, matchesFeatureFlagRule } from "./evaluator.js";
import { precompileFeatureFlagRegexPattern } from "./regex.js";

const baseFlag = {
  flagId: 1,
  siteId: 10,
  key: "new_checkout",
  description: null,
  enabled: true,
  runtime: "client",
  flagType: "boolean",
  payload: null,
  variants: [],
  rolloutPercentage: 100,
  rules: [],
  conditionSets: [],
  salt: "salt",
  version: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} as any;

describe("feature flag evaluator", () => {
  it("matches targeting rules against request context", () => {
    expect(
      matchesFeatureFlagRule(
        { field: "pathname", operator: "starts_with", value: "/pricing" },
        { anonymousId: "visitor-1", pathname: "/pricing/pro" }
      )
    ).toBe(true);

    expect(
      matchesFeatureFlagRule(
        { field: "query", key: "plan", operator: "equals", value: ["pro", "team"] },
        { anonymousId: "visitor-1", query: { plan: "team" } }
      )
    ).toBe(true);
  });

  it("matches regex rules using precompiled patterns", () => {
    const pattern = "^/pricing(/|$)";
    precompileFeatureFlagRegexPattern(pattern);

    expect(
      matchesFeatureFlagRule(
        { field: "pathname", operator: "regex", value: pattern },
        { anonymousId: "visitor-1", pathname: "/pricing/pro" }
      )
    ).toBe(true);
  });

  it("returns off value when disabled or targeting fails", () => {
    expect(evaluateFeatureFlag({ ...baseFlag, enabled: false }, { anonymousId: "visitor-1" })).toMatchObject({
      value: false,
      reason: "disabled",
      matched: false,
    });

    expect(
      evaluateFeatureFlag(
        { ...baseFlag, rules: [{ field: "country", operator: "equals", value: "US" }] },
        { anonymousId: "visitor-1", country: "GB" }
      )
    ).toMatchObject({
      value: false,
      reason: "target_mismatch",
      matched: false,
    });
  });

  it("applies rollout after targeting matches", () => {
    expect(evaluateFeatureFlag({ ...baseFlag, rolloutPercentage: 100 }, { anonymousId: "visitor-1" })).toMatchObject({
      value: true,
      payload: null,
      reason: "rollout",
      matched: true,
    });

    expect(evaluateFeatureFlag({ ...baseFlag, rolloutPercentage: 0 }, { anonymousId: "visitor-1" })).toMatchObject({
      value: false,
      reason: "fallthrough",
      matched: false,
    });
  });

  it("uses the first matching condition set", () => {
    expect(
      evaluateFeatureFlag(
        {
          ...baseFlag,
          conditionSets: [
            {
              name: "us beta",
              rules: [{ field: "country", operator: "equals", value: "US" }],
              rolloutPercentage: 0,
            },
            {
              name: "all traffic",
              rules: [],
              rolloutPercentage: 100,
              payload: { copy: "fallback" },
            },
          ],
        },
        { anonymousId: "visitor-1", country: "GB" }
      )
    ).toMatchObject({
      value: true,
      payload: { copy: "fallback" },
      conditionSet: "all traffic",
      reason: "rollout",
      matched: true,
    });
  });

  it("assigns multivariate variants by rollout percentage", () => {
    expect(
      evaluateFeatureFlag(
        {
          ...baseFlag,
          flagType: "multivariate",
          variants: [
            { key: "control", rolloutPercentage: 100, payload: { color: "blue" } },
            { key: "test", rolloutPercentage: 0, payload: { color: "green" } },
          ],
        },
        { anonymousId: "visitor-1" }
      )
    ).toMatchObject({
      value: "control",
      variant: "control",
      payload: { color: "blue" },
      reason: "variant",
      matched: true,
    });
  });

  it("assigns multivariate variants from the first matching condition set", () => {
    expect(
      evaluateFeatureFlag(
        {
          ...baseFlag,
          flagType: "multivariate",
          variants: [],
          conditionSets: [
            {
              name: "wrong country",
              rules: [{ field: "country", operator: "equals", value: "GB" }],
              variants: [
                { key: "gb_control", rolloutPercentage: 100 },
                { key: "gb_test", rolloutPercentage: 0 },
              ],
            },
            {
              name: "us traffic",
              rules: [{ field: "country", operator: "equals", value: "US" }],
              variants: [
                { key: "us_control", rolloutPercentage: 100, payload: { color: "blue" } },
                { key: "us_test", rolloutPercentage: 0, payload: { color: "green" } },
              ],
            },
          ],
        },
        { anonymousId: "visitor-1", country: "US" }
      )
    ).toMatchObject({
      value: "us_control",
      variant: "us_control",
      payload: { color: "blue" },
      conditionSet: "us traffic",
      reason: "variant",
      matched: true,
    });
  });

  it("returns remote config payload from the first matching condition set", () => {
    expect(
      evaluateFeatureFlag(
        {
          ...baseFlag,
          flagType: "remote_config",
          conditionSets: [
            {
              name: "wrong country",
              rules: [{ field: "country", operator: "equals", value: "US" }],
              payload: { checkoutColor: "blue" },
            },
            {
              name: "fallback",
              rules: [],
              payload: { checkoutColor: "green" },
            },
          ],
        },
        { anonymousId: "visitor-1", country: "GB" }
      )
    ).toMatchObject({
      value: true,
      payload: { checkoutColor: "green" },
      conditionSet: "fallback",
      reason: "remote_config",
      matched: true,
    });
  });

  it("uses stable hash buckets", () => {
    expect(bucketPercentage("site:flag:visitor:salt")).toBe(bucketPercentage("site:flag:visitor:salt"));
    expect(bucketPercentage("site:flag:visitor:salt")).toBeGreaterThanOrEqual(0);
    expect(bucketPercentage("site:flag:visitor:salt")).toBeLessThanOrEqual(100);
  });
});
