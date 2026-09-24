import { describe, it, expect } from "vitest";
import { buildFunnelStepCondition, FunnelStep } from "./funnelSteps.js";

describe("buildFunnelStepCondition — page steps", () => {
  it("builds a pageview condition from a literal path", () => {
    expect(buildFunnelStepCondition({ type: "page", value: "/pricing" })).toBe(
      "type = 'pageview' AND match(pathname, '^/pricing$')"
    );
  });

  it("expands a single wildcard to one path segment", () => {
    expect(buildFunnelStepCondition({ type: "page", value: "/blog/*" })).toBe(
      "type = 'pageview' AND match(pathname, '^/blog/[^/]+$')"
    );
  });

  it("expands a double wildcard across path segments", () => {
    expect(buildFunnelStepCondition({ type: "page", value: "/docs/**" })).toBe(
      "type = 'pageview' AND match(pathname, '^/docs/.*$')"
    );
  });

  it("matches property filters against url_parameters", () => {
    expect(
      buildFunnelStepCondition({
        type: "page",
        value: "/pricing",
        propertyFilters: [{ key: "utm_source", value: "google" }],
      })
    ).toBe("type = 'pageview' AND match(pathname, '^/pricing$') AND url_parameters['utm_source'] = 'google'");
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

  it("matches property filters against props", () => {
    expect(
      buildFunnelStepCondition({
        type: "event",
        value: "purchase",
        propertyFilters: [{ key: "plan", value: "pro" }],
      })
    ).toBe("type = 'custom_event' AND event_name = 'purchase' AND JSONExtractString(toString(props), 'plan') = 'pro'");
  });

  it("compares numeric property filters as floats", () => {
    expect(
      buildFunnelStepCondition({
        type: "event",
        value: "purchase",
        propertyFilters: [{ key: "amount", value: 10 }],
      })
    ).toBe(
      "type = 'custom_event' AND event_name = 'purchase' AND toFloat64(JSONExtractString(toString(props), 'amount')) = 10"
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

  it("prefers propertyFilters over the deprecated fields", () => {
    expect(
      buildFunnelStepCondition({
        type: "event",
        value: "purchase",
        propertyFilters: [{ key: "new", value: "yes" }],
        eventPropertyKey: "legacy",
        eventPropertyValue: "no",
      })
    ).toBe("type = 'custom_event' AND event_name = 'purchase' AND JSONExtractString(toString(props), 'new') = 'yes'");
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

  it("escapes quotes in the event name", () => {
    expect(buildFunnelStepCondition({ type: "event", value: "evt'; DROP TABLE events;--" })).toBe(
      "type = 'custom_event' AND event_name = 'evt\\'; DROP TABLE events;--'"
    );
  });
});

describe("buildFunnelStepCondition — autocapture steps", () => {
  it("uses the step value as the autocapture value pattern", () => {
    expect(buildFunnelStepCondition({ type: "outbound", value: "https://partner.com/*" })).toBe(
      "type = 'outbound' AND (match(JSONExtractString(toString(props), 'url'), '^https://partner\\\\.com/.+$'))"
    );
  });

  it("matches a button_click step against the text prop", () => {
    expect(buildFunnelStepCondition({ type: "button_click", value: "Buy now" })).toBe(
      "type = 'button_click' AND (match(JSONExtractString(toString(props), 'text'), '^Buy now$'))"
    );
  });

  it("ORs a form_submit step across all three form props", () => {
    expect(buildFunnelStepCondition({ type: "form_submit", value: "signup" })).toBe(
      "type = 'form_submit' AND (match(JSONExtractString(toString(props), 'formName'), '^signup$') OR " +
        "match(JSONExtractString(toString(props), 'formId'), '^signup$') OR " +
        "match(JSONExtractString(toString(props), 'formAction'), '^signup$'))"
    );
  });

  it("matches a copy step against the text prop", () => {
    expect(buildFunnelStepCondition({ type: "copy", value: "coupon-*" })).toBe(
      "type = 'copy' AND (match(JSONExtractString(toString(props), 'text'), '^coupon-.+$'))"
    );
  });

  it("matches the bare type when the value is empty or whitespace", () => {
    expect(buildFunnelStepCondition({ type: "outbound", value: "" })).toBe("type = 'outbound'");
    expect(buildFunnelStepCondition({ type: "copy", value: "   " })).toBe("type = 'copy'");
  });

  it("applies property filters after the value pattern", () => {
    expect(
      buildFunnelStepCondition({
        type: "outbound",
        value: "https://x.com",
        propertyFilters: [{ key: "target", value: "_blank" }],
      })
    ).toBe(
      "type = 'outbound' AND (match(JSONExtractString(toString(props), 'url'), '^https://x\\\\.com$'))" +
        " AND JSONExtractString(toString(props), 'target') = '_blank'"
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

describe("buildFunnelStepCondition — multi-step sequences", () => {
  it("builds an independent condition per step, in order", () => {
    const steps: FunnelStep[] = [
      { type: "page", value: "/", name: "Landing" },
      { type: "page", value: "/pricing", name: "Pricing" },
      { type: "button_click", value: "Start trial", name: "CTA" },
      { type: "event", value: "signup", name: "Signup", propertyFilters: [{ key: "plan", value: "pro" }] },
    ];

    expect(steps.map(buildFunnelStepCondition)).toEqual([
      "type = 'pageview' AND match(pathname, '^/$')",
      "type = 'pageview' AND match(pathname, '^/pricing$')",
      "type = 'button_click' AND (match(JSONExtractString(toString(props), 'text'), '^Start trial$'))",
      "type = 'custom_event' AND event_name = 'signup' AND JSONExtractString(toString(props), 'plan') = 'pro'",
    ]);
  });

  it("keeps per-step hostnames independent", () => {
    const steps: FunnelStep[] = [
      { type: "page", value: "/a", hostname: "marketing.example.com" },
      { type: "page", value: "/b" },
    ];

    expect(steps.map(buildFunnelStepCondition)).toEqual([
      "type = 'pageview' AND match(pathname, '^/a$') AND hostname = 'marketing.example.com'",
      "type = 'pageview' AND match(pathname, '^/b$')",
    ]);
  });

  it("produces nothing for an empty step list", () => {
    const steps: FunnelStep[] = [];
    expect(steps.map(buildFunnelStepCondition)).toEqual([]);
  });
});
