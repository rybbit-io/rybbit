import { describe, it, expect } from "vitest";
import { buildGoalCondition } from "./goalConditions.js";

describe("buildGoalCondition — path goals", () => {
  it("builds a pageview condition from a literal path pattern", () => {
    expect(buildGoalCondition({ goalType: "path", config: { pathPattern: "/checkout/success" } })).toBe(
      "type = 'pageview' AND match(pathname, '^/checkout/success$')"
    );
  });

  it("returns null when the path pattern is missing or empty", () => {
    expect(buildGoalCondition({ goalType: "path", config: {} })).toBeNull();
    expect(buildGoalCondition({ goalType: "path", config: { pathPattern: "" } })).toBeNull();
  });

  it("ignores eventName on a path goal", () => {
    expect(buildGoalCondition({ goalType: "path", config: { eventName: "signup" } })).toBeNull();
  });
});

describe("buildGoalCondition — event goals", () => {
  it("builds a custom_event condition from the event name", () => {
    expect(buildGoalCondition({ goalType: "event", config: { eventName: "signup" } })).toBe(
      "type = 'custom_event' AND event_name = 'signup'"
    );
  });

  it("honours the legacy single-property fields", () => {
    expect(
      buildGoalCondition({
        goalType: "event",
        config: { eventName: "purchase", eventPropertyKey: "plan", eventPropertyValue: "pro" },
      })
    ).toBe("type = 'custom_event' AND event_name = 'purchase' AND JSONExtractString(toString(props), 'plan') = 'pro'");
  });

  it("returns null when the event name is missing or empty", () => {
    expect(buildGoalCondition({ goalType: "event", config: {} })).toBeNull();
    expect(buildGoalCondition({ goalType: "event", config: { eventName: "" } })).toBeNull();
  });
});

describe("buildGoalCondition — autocapture goals", () => {
  it("matches a bare autocapture type when no value pattern is set", () => {
    expect(buildGoalCondition({ goalType: "outbound", config: {} })).toBe("type = 'outbound'");
    expect(buildGoalCondition({ goalType: "button_click", config: {} })).toBe("type = 'button_click'");
    expect(buildGoalCondition({ goalType: "form_submit", config: {} })).toBe("type = 'form_submit'");
    expect(buildGoalCondition({ goalType: "copy", config: {} })).toBe("type = 'copy'");
  });

  it("narrows an outbound goal by its url pattern", () => {
    expect(buildGoalCondition({ goalType: "outbound", config: { valuePattern: "https://partner.com/**" } })).toBe(
      "type = 'outbound' AND (match(JSONExtractString(toString(props), 'url'), '^https://partner\\\\.com/.*$'))"
    );
  });

  it("ignores pathPattern and eventName on an autocapture goal", () => {
    expect(buildGoalCondition({ goalType: "outbound", config: { pathPattern: "/x", eventName: "y" } })).toBe(
      "type = 'outbound'"
    );
  });
});

describe("buildGoalCondition — malformed input", () => {
  it("returns null for an unknown goal type", () => {
    expect(buildGoalCondition({ goalType: "unknown", config: { pathPattern: "/x" } })).toBeNull();
    expect(buildGoalCondition({ goalType: "pageview", config: { pathPattern: "/x" } })).toBeNull();
  });

  it("returns null for an empty goal type", () => {
    expect(buildGoalCondition({ goalType: "", config: {} })).toBeNull();
  });

  it("is case sensitive on the goal type", () => {
    expect(buildGoalCondition({ goalType: "Path", config: { pathPattern: "/x" } })).toBeNull();
    expect(buildGoalCondition({ goalType: "EVENT", config: { eventName: "signup" } })).toBeNull();
    expect(buildGoalCondition({ goalType: "Outbound", config: {} })).toBeNull();
  });

  it("does not treat 'page' as a path goal (that spelling belongs to funnel steps)", () => {
    expect(buildGoalCondition({ goalType: "page", config: { pathPattern: "/x" } })).toBeNull();
  });
});
