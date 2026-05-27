import { describe, expect, it } from "vitest";
import { bucketPercentage, evaluateFeatureFlag, matchesFeatureFlagRule } from "./evaluator.js";

const baseFlag = {
  flagId: 1,
  siteId: 10,
  key: "new_checkout",
  name: "New checkout",
  description: null,
  enabled: true,
  clientEnabled: true,
  flagType: "boolean",
  payload: null,
  variants: [],
  rolloutPercentage: 100,
  rules: [],
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

  it("returns remote config payload without applying release conditions", () => {
    expect(
      evaluateFeatureFlag(
        {
          ...baseFlag,
          flagType: "remote_config",
          payload: { checkoutColor: "green" },
          rules: [{ field: "country", operator: "equals", value: "US" }],
          rolloutPercentage: 0,
        },
        { anonymousId: "visitor-1", country: "GB" }
      )
    ).toMatchObject({
      value: true,
      payload: { checkoutColor: "green" },
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
