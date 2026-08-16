import { describe, it, expect } from "vitest";
import { buildGoalCondition } from "./goalConditions.js";

describe("buildGoalCondition — path goals", () => {
  it("builds a pageview condition from a literal path pattern", () => {
    expect(buildGoalCondition({ goalType: "path", config: { pathPattern: "/checkout/success" } })).toBe(
      "type = 'pageview' AND match(pathname, '^/checkout/success$')"
    );
  });

  it("expands wildcards in the path pattern", () => {
    expect(buildGoalCondition({ goalType: "path", config: { pathPattern: "/blog/*" } })).toBe(
      "type = 'pageview' AND match(pathname, '^/blog/[^/]+$')"
    );
    expect(buildGoalCondition({ goalType: "path", config: { pathPattern: "/docs/**" } })).toBe(
      "type = 'pageview' AND match(pathname, '^/docs/.*$')"
    );
  });

  it("applies property filters as url_parameters comparisons", () => {
    expect(
      buildGoalCondition({
        goalType: "path",
        config: { pathPattern: "/pricing", propertyFilters: [{ key: "utm_source", value: "google" }] },
      })
    ).toBe("type = 'pageview' AND match(pathname, '^/pricing$') AND url_parameters['utm_source'] = 'google'");
  });

  it("AND-joins multiple property filters", () => {
    expect(
      buildGoalCondition({
        goalType: "path",
        config: {
          pathPattern: "/pricing",
          propertyFilters: [
            { key: "utm_source", value: "google" },
            { key: "utm_medium", value: "cpc" },
          ],
        },
      })
    ).toBe(
      "type = 'pageview' AND match(pathname, '^/pricing$') AND url_parameters['utm_source'] = 'google' AND url_parameters['utm_medium'] = 'cpc'"
    );
  });

  it("honours the legacy single-property fields", () => {
    expect(
      buildGoalCondition({
        goalType: "path",
        config: { pathPattern: "/pricing", eventPropertyKey: "utm_source", eventPropertyValue: "google" },
      })
    ).toBe("type = 'pageview' AND match(pathname, '^/pricing$') AND url_parameters['utm_source'] = 'google'");
  });

  it("returns null when the path pattern is missing or empty", () => {
    expect(buildGoalCondition({ goalType: "path", config: {} })).toBeNull();
    expect(buildGoalCondition({ goalType: "path", config: { pathPattern: "" } })).toBeNull();
  });

  it("ignores eventName on a path goal", () => {
    expect(buildGoalCondition({ goalType: "path", config: { eventName: "signup" } })).toBeNull();
  });

  it("escapes quotes in the path pattern", () => {
    expect(buildGoalCondition({ goalType: "path", config: { pathPattern: "/a'b" } })).toBe(
      "type = 'pageview' AND match(pathname, '^/a\\'b$')"
    );
  });
});

describe("buildGoalCondition — event goals", () => {
  it("builds a custom_event condition from the event name", () => {
    expect(buildGoalCondition({ goalType: "event", config: { eventName: "signup" } })).toBe(
      "type = 'custom_event' AND event_name = 'signup'"
    );
  });

  it("applies property filters against props", () => {
    expect(
      buildGoalCondition({
        goalType: "event",
        config: { eventName: "purchase", propertyFilters: [{ key: "plan", value: "pro" }] },
      })
    ).toBe("type = 'custom_event' AND event_name = 'purchase' AND JSONExtractString(toString(props), 'plan') = 'pro'");
  });

  it("compares numeric property filters as floats", () => {
    expect(
      buildGoalCondition({
        goalType: "event",
        config: { eventName: "purchase", propertyFilters: [{ key: "amount", value: 99.5 }] },
      })
    ).toBe(
      "type = 'custom_event' AND event_name = 'purchase' AND toFloat64(JSONExtractString(toString(props), 'amount')) = 99.5"
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

  it("prefers propertyFilters over the legacy fields when both are present", () => {
    expect(
      buildGoalCondition({
        goalType: "event",
        config: {
          eventName: "purchase",
          propertyFilters: [{ key: "new", value: "yes" }],
          eventPropertyKey: "legacy",
          eventPropertyValue: "no",
        },
      })
    ).toBe("type = 'custom_event' AND event_name = 'purchase' AND JSONExtractString(toString(props), 'new') = 'yes'");
  });

  it("returns null when the event name is missing or empty", () => {
    expect(buildGoalCondition({ goalType: "event", config: {} })).toBeNull();
    expect(buildGoalCondition({ goalType: "event", config: { eventName: "" } })).toBeNull();
  });

  it("escapes quotes in the event name", () => {
    expect(buildGoalCondition({ goalType: "event", config: { eventName: "evt'; DROP TABLE events;--" } })).toBe(
      "type = 'custom_event' AND event_name = 'evt\\'; DROP TABLE events;--'"
    );
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

  it("narrows a button_click goal by its text pattern", () => {
    expect(buildGoalCondition({ goalType: "button_click", config: { valuePattern: "Buy now" } })).toBe(
      "type = 'button_click' AND (match(JSONExtractString(toString(props), 'text'), '^Buy now$'))"
    );
  });

  it("ORs a form_submit value pattern over all three form props", () => {
    expect(buildGoalCondition({ goalType: "form_submit", config: { valuePattern: "signup" } })).toBe(
      "type = 'form_submit' AND (match(JSONExtractString(toString(props), 'formName'), '^signup$') OR " +
        "match(JSONExtractString(toString(props), 'formId'), '^signup$') OR " +
        "match(JSONExtractString(toString(props), 'formAction'), '^signup$'))"
    );
  });

  it("applies property filters alongside the value pattern", () => {
    expect(
      buildGoalCondition({
        goalType: "copy",
        config: { valuePattern: "coupon-*", propertyFilters: [{ key: "page", value: "/pricing" }] },
      })
    ).toBe(
      "type = 'copy' AND (match(JSONExtractString(toString(props), 'text'), '^coupon-.+$'))" +
        " AND JSONExtractString(toString(props), 'page') = '/pricing'"
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

  it("returns null for an entirely empty goal", () => {
    expect(buildGoalCondition({ goalType: "path", config: {} })).toBeNull();
    expect(buildGoalCondition({ goalType: "event", config: {} })).toBeNull();
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
