import { describe, it, expect } from "vitest";
import { escapeLiteral } from "../utils/eventConditions.js";
import { buildFunnelStepCondition, FunnelStep, parseFunnelSteps } from "./funnelSteps.js";

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

describe("parseFunnelSteps", () => {
  const page = { type: "page", value: "/a" };

  it("accepts well-formed steps", () => {
    const steps = [page, { type: "event", value: "signup", propertyFilters: [{ key: "plan", value: 3 }] }];
    expect(parseFunnelSteps(steps)).toEqual(steps);
  });

  // sqlstring renders an object as `key` = 'value' and an array as a bare list,
  // so a non-string field is not a literal any more: it is query structure.
  it.each([
    ["an object hostname", { ...page, hostname: { pathname: "x" } }],
    ["an array value", { type: "event", value: ["a", "b"] }],
    ["an object step name", { ...page, name: { a: 1 } }],
    ["an object property key", { ...page, propertyFilters: [{ key: { a: 1 }, value: "x" }] }],
    ["an object property value", { ...page, propertyFilters: [{ key: "k", value: { a: 1 } }] }],
    ["an object legacy property value", { ...page, eventPropertyKey: "k", eventPropertyValue: ["x"] }],
  ])("rejects %s", (_label, step) => {
    expect(parseFunnelSteps([page, step])).toBeNull();
  });

  it("rejects fewer than two steps, more than the cap, and non-arrays", () => {
    expect(parseFunnelSteps([page])).toBeNull();
    expect(parseFunnelSteps([page, page, page], 2)).toBeNull();
    expect(parseFunnelSteps({ length: 2 })).toBeNull();
    expect(parseFunnelSteps(undefined)).toBeNull();
  });
});

describe("escapeLiteral", () => {
  it("quotes scalars", () => {
    expect(escapeLiteral("it's")).toBe("'it\\'s'");
    expect(escapeLiteral(3)).toBe("3");
    expect(escapeLiteral(true)).toBe("true");
  });

  it("refuses anything sqlstring would not render as a literal", () => {
    expect(() => escapeLiteral({ pathname: "x" } as never)).toThrow(TypeError);
    expect(() => escapeLiteral(["a"] as never)).toThrow(TypeError);
    expect(() => escapeLiteral(null as never)).toThrow(TypeError);
  });

  it("keeps a malformed step out of the query even if it skips validation", () => {
    const step = { type: "page", value: "/a", hostname: { pathname: "x" } } as unknown as FunnelStep;
    expect(() => buildFunnelStepCondition(step)).toThrow(TypeError);
  });
});
