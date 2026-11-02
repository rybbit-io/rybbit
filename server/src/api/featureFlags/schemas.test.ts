import { describe, expect, it } from "vitest";
import {
  featureFlagBodySchema,
  featureFlagUpdateSchema,
  validateFeatureFlagUpdate,
  type FeatureFlagShape,
} from "./schemas.js";

const baseFlag = {
  key: "new_checkout",
  enabled: true,
  runtime: "client",
  flagType: "boolean",
  rolloutPercentage: 100,
};

describe("feature flag schemas", () => {
  it("accepts safe regex targeting rules", () => {
    const result = featureFlagBodySchema.safeParse({
      ...baseFlag,
      rules: [{ field: "pathname", operator: "regex", value: "^/pricing(/|$)" }],
    });

    expect(result.success).toBe(true);
  });

  it("rejects unsafe regex targeting rules", () => {
    const result = featureFlagBodySchema.safeParse({
      ...baseFlag,
      rules: [{ field: "pathname", operator: "regex", value: "(a+)+$" }],
    });

    expect(result.success).toBe(false);
  });

  // The tracker records a flag that is off or on as "false"/"true", which such a variant would collide with.
  it.each(["true", "false"])("rejects the reserved variant key %s", key => {
    const multivariate = { ...baseFlag, flagType: "multivariate" };
    const control = { key: "control", rolloutPercentage: 50 };
    const variants = [control, { key, rolloutPercentage: 50 }];

    expect(featureFlagBodySchema.safeParse({ ...multivariate, variants }).success).toBe(false);
    expect(featureFlagBodySchema.safeParse({ ...multivariate, conditionSets: [{ variants }] }).success).toBe(false);
    expect(featureFlagUpdateSchema.safeParse({ variants }).success).toBe(false);

    const capitalized = [control, { key: key.toUpperCase(), rolloutPercentage: 50 }];
    expect(featureFlagBodySchema.safeParse({ ...multivariate, variants: capitalized }).success).toBe(true);
  });
});

describe("feature flag partial updates", () => {
  const storedMultivariate: Required<FeatureFlagShape> = {
    flagType: "multivariate",
    variants: [
      { key: "control", rolloutPercentage: 50 },
      { key: "treatment", rolloutPercentage: 50 },
    ],
    conditionSets: [],
  };

  const validate =
    (patch: unknown, stored = storedMultivariate) =>
    () =>
      validateFeatureFlagUpdate(stored, featureFlagUpdateSchema.parse(patch));

  it("rejects duplicate variant keys or rollouts over 100% when flagType is omitted", () => {
    expect(
      validate({
        variants: [
          { key: "control", rolloutPercentage: 60 },
          { key: "control", rolloutPercentage: 60 },
        ],
      })
    ).toThrow(/Variant keys must be unique[\s\S]*cannot exceed 100/);
  });

  it("rejects a single variant on a stored multivariate flag", () => {
    expect(validate({ variants: [{ key: "control", rolloutPercentage: 100 }] })).toThrow(
      "Multivariate flags require at least two variants"
    );
  });

  it("rejects a type change that would keep the stored variants", () => {
    expect(validate({ flagType: "boolean" })).toThrow("Boolean flags cannot have variants");
    expect(() => validateFeatureFlagUpdate(storedMultivariate, { flagType: "boolean", variants: [] })).not.toThrow();
  });

  it("still saves other changes to a stored flag that has a variant keyed false", () => {
    const storedLegacy: Required<FeatureFlagShape> = {
      flagType: "multivariate",
      variants: [
        { key: "control", rolloutPercentage: 50 },
        { key: "false", rolloutPercentage: 50 },
      ],
      conditionSets: [],
    };
    expect(validate({ enabled: false, description: "paused" }, storedLegacy)).not.toThrow();
  });

  it("accepts patches whose merged flag is valid", () => {
    const storedBoolean: Required<FeatureFlagShape> = { flagType: "boolean", variants: [], conditionSets: [] };
    expect(validate({ flagType: "multivariate" })).not.toThrow();
    expect(validate({ enabled: true }, storedBoolean)).not.toThrow();
  });
});
