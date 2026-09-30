import { describe, expect, it } from "vitest";
import { hasIncompleteSteps } from "./funnels";

describe("funnel required step values", () => {
  it.each(["page", "event"] as const)("rejects blank and whitespace-only %s values", type => {
    expect(hasIncompleteSteps([{ type, value: "" }])).toBe(true);
    expect(hasIncompleteSteps([{ type, value: " \t " }])).toBe(true);
    expect(hasIncompleteSteps([{ type, value: "/checkout" }])).toBe(false);
  });
  it("allows an empty autocapture value to match any event of its type", () => {
    expect(hasIncompleteSteps([{ type: "button_click", value: "" }])).toBe(false);
  });
});
