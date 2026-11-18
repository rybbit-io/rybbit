import { describe, it, expect } from "vitest";
import { buildFunnelStepCondition, FunnelStep } from "./funnelSteps.js";

describe("buildFunnelStepCondition — page steps", () => {
  it("builds a pageview condition from a literal path", () => {
    expect(buildFunnelStepCondition({ type: "page", value: "/pricing" })).toBe(
      "type = 'pageview' AND match(pathname, '^/pricing$')"
    );
  });

  it("anchors an empty value to the empty path", () => {
    expect(buildFunnelStepCondition({ type: "page", value: "" })).toBe("type = 'pageview' AND match(pathname, '^$')");
  });
});

describe("buildFunnelStepCondition — event steps", () => {
  it("builds a custom_event condition from the value", () => {
    expect(buildFunnelStepCondition({ type: "event", value: "signup" })).toBe(
      "type = 'custom_event' AND event_name = 'signup'"
    );
  });

  it("honours the deprecated single-property fields", () => {
    expect(
      buildFunnelStepCondition({
        type: "event",
        value: "purchase",
        eventPropertyKey: "plan",
        eventPropertyValue: "pro",
      })
    ).toBe("type = 'custom_event' AND event_name = 'purchase' AND JSONExtractString(toString(props), 'plan') = 'pro'");
  });

  it("falls back to a custom event match for unknown legacy step types", () => {
    // Anything that is neither "page" nor an autocapture type is treated as a
    // custom event name.
    expect(buildFunnelStepCondition({ type: "legacy_thing" as FunnelStep["type"], value: "signup" })).toBe(
      "type = 'custom_event' AND event_name = 'signup'"
    );
    expect(buildFunnelStepCondition({ type: "" as FunnelStep["type"], value: "signup" })).toBe(
      "type = 'custom_event' AND event_name = 'signup'"
    );
  });

  it("treats 'path' as an event step, since page steps use the 'page' spelling", () => {
    expect(buildFunnelStepCondition({ type: "path" as FunnelStep["type"], value: "/pricing" })).toBe(
      "type = 'custom_event' AND event_name = '/pricing'"
    );
  });
});

describe("buildFunnelStepCondition — autocapture steps", () => {
  it("uses the step value as the autocapture value pattern", () => {
    expect(buildFunnelStepCondition({ type: "outbound", value: "https://partner.com/*" })).toBe(
      "type = 'outbound' AND (match(JSONExtractString(toString(props), 'url'), '^https://partner\\\\.com/.+$'))"
    );
  });
});

describe("buildFunnelStepCondition — hostname", () => {
  it("appends a hostname clause last for page steps", () => {
    expect(buildFunnelStepCondition({ type: "page", value: "/pricing", hostname: "app.example.com" })).toBe(
      "type = 'pageview' AND match(pathname, '^/pricing$') AND hostname = 'app.example.com'"
    );
  });

  it("appends a hostname clause for event steps", () => {
    expect(buildFunnelStepCondition({ type: "event", value: "signup", hostname: "app.example.com" })).toBe(
      "type = 'custom_event' AND event_name = 'signup' AND hostname = 'app.example.com'"
    );
  });

  it("appends a hostname clause after autocapture filters", () => {
    expect(
      buildFunnelStepCondition({
        type: "copy",
        value: "coupon",
        propertyFilters: [{ key: "page", value: "/x" }],
        hostname: "app.example.com",
      })
    ).toBe(
      "type = 'copy' AND (match(JSONExtractString(toString(props), 'text'), '^coupon$'))" +
        " AND JSONExtractString(toString(props), 'page') = '/x'" +
        " AND hostname = 'app.example.com'"
    );
  });

  it("omits the hostname clause when it is empty", () => {
    expect(buildFunnelStepCondition({ type: "page", value: "/pricing", hostname: "" })).toBe(
      "type = 'pageview' AND match(pathname, '^/pricing$')"
    );
  });

  it("escapes quotes in the hostname", () => {
    expect(buildFunnelStepCondition({ type: "page", value: "/x", hostname: "a'; DROP TABLE events;--" })).toBe(
      "type = 'pageview' AND match(pathname, '^/x$') AND hostname = 'a\\'; DROP TABLE events;--'"
    );
  });
});
