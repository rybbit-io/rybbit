import { describe, expect, it } from "vitest";
import { normaliseSteps } from "./funnelService.js";

describe("normaliseSteps", () => {
  it("reorders steps based on provided order", () => {
    const steps = normaliseSteps([
      { key: "third", name: "Third", order: 10 },
      { key: "first", name: "First", order: 0 },
      { key: "second", name: "Second", order: 1 },
    ]);

    expect(steps.map(step => step.key)).toEqual(["first", "second", "third"]);
    expect(steps.map(step => step.order)).toEqual([0, 1, 2]);
  });

  it("auto-assigns order when missing", () => {
    const steps = normaliseSteps([
      { key: "a", name: "A" },
      { key: "b", name: "B" },
    ]);

    expect(steps.map(step => step.order)).toEqual([0, 1]);
  });

  it("throws on duplicate step keys", () => {
    expect(() =>
      normaliseSteps([
        { key: "a", name: "A" },
        { key: "a", name: "Duplicate" },
      ])
    ).toThrow(/Duplicate step key detected/);
  });
});
