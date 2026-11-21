import { describe, expect, it } from "vitest";

import { buildIdentifyTraits } from "./identifyUserTraits";

describe("buildIdentifyTraits", () => {
  it("combines built-in and arbitrary traits while preserving supported value types", () => {
    const result = buildIdentifyTraits(" Ada Lovelace ", " ada@example.com ", [
      { key: "plan", value: "pro" },
      { key: "seats", value: "3" },
      { key: "active", value: "true" },
      { key: "preferences", value: '{"theme":"dark"}' },
    ]);

    expect(result).toEqual({
      traits: {
        name: "Ada Lovelace",
        email: "ada@example.com",
        plan: "pro",
        seats: 3,
        active: true,
        preferences: { theme: "dark" },
      },
      errors: {},
    });
  });

  it("ignores a completely empty trait row", () => {
    expect(buildIdentifyTraits("", "", [{ key: "", value: "" }])).toEqual({ traits: {}, errors: {} });
  });

  it("requires a key when a row contains a value", () => {
    expect(buildIdentifyTraits("", "", [{ key: "", value: "pro" }])).toEqual({
      traits: {},
      errors: { 0: "missing-key" },
    });
  });

  it("rejects duplicate custom and built-in keys", () => {
    expect(
      buildIdentifyTraits("Ada", "", [
        { key: "name", value: "Grace" },
        { key: "plan", value: "free" },
        { key: "plan", value: "pro" },
      ])
    ).toEqual({
      traits: { name: "Ada", plan: "free" },
      errors: { 0: "duplicate-key", 2: "duplicate-key" },
    });
  });
});
