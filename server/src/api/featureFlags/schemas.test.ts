import { describe, expect, it } from "vitest";
import { featureFlagBodySchema } from "./schemas.js";

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
});
