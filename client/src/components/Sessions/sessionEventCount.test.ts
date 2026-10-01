import { describe, expect, it } from "vitest";
import { sessionEventCount } from "./sessionEventCount";

describe("sessionEventCount", () => {
  it("adds custom events and autocaptured interactions, the sum the events range filters on", () => {
    expect(sessionEventCount({ events: 3, button_clicks: 2, copies: 1, form_submits: 1, input_changes: 4 })).toBe(11);
  });

  it("copes with lists that only report custom events", () => {
    // Goal and funnel session lists leave the autocapture counts out.
    expect(sessionEventCount({ events: 5 } as Parameters<typeof sessionEventCount>[0])).toBe(5);
  });
});
