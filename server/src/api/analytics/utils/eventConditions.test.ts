import { describe, it, expect } from "vitest";
import {
  AUTOCAPTURE_PATTERN_PROPS,
  AUTOCAPTURE_TARGET_TYPES,
  buildAutocaptureCondition,
  buildEventCondition,
  buildPageCondition,
  isAutocaptureTargetType,
  resolvePropertyFilters,
} from "./eventConditions.js";

describe("isAutocaptureTargetType", () => {
  it("accepts every declared autocapture target type", () => {
    expect(AUTOCAPTURE_TARGET_TYPES).toEqual(["outbound", "button_click", "form_submit", "copy"]);
    for (const type of AUTOCAPTURE_TARGET_TYPES) {
      expect(isAutocaptureTargetType(type)).toBe(true);
    }
  });

  it("rejects the non-autocapture target types", () => {
    expect(isAutocaptureTargetType("page")).toBe(false);
    expect(isAutocaptureTargetType("path")).toBe(false);
    expect(isAutocaptureTargetType("event")).toBe(false);
    expect(isAutocaptureTargetType("pageview")).toBe(false);
    expect(isAutocaptureTargetType("")).toBe(false);
  });

  it("is case sensitive and does not accept near-misses", () => {
    expect(isAutocaptureTargetType("Outbound")).toBe(false);
    expect(isAutocaptureTargetType("outbound ")).toBe(false);
    expect(isAutocaptureTargetType("buttonclick")).toBe(false);
  });

  it("declares pattern props for every target type", () => {
    expect(AUTOCAPTURE_PATTERN_PROPS).toEqual({
      outbound: ["url"],
      button_click: ["text"],
      form_submit: ["formName", "formId", "formAction"],
      copy: ["text"],
    });
    for (const type of AUTOCAPTURE_TARGET_TYPES) {
      expect(AUTOCAPTURE_PATTERN_PROPS[type].length).toBeGreaterThan(0);
    }
  });
});

describe("resolvePropertyFilters", () => {
  it("returns an empty list when nothing is configured", () => {
    expect(resolvePropertyFilters({})).toEqual([]);
  });

  it("prefers the propertyFilters array when present", () => {
    const filters = [{ key: "plan", value: "pro" }];
    expect(resolvePropertyFilters({ propertyFilters: filters })).toBe(filters);
  });

  it("returns an empty propertyFilters array as-is, ignoring the legacy fields", () => {
    // An empty array is truthy, so it short-circuits the legacy fallback.
    const filters: { key: string; value: string }[] = [];
    expect(
      resolvePropertyFilters({ propertyFilters: filters, eventPropertyKey: "plan", eventPropertyValue: "pro" })
    ).toBe(filters);
  });

  it("lifts the legacy single-property fields into a one-element array", () => {
    expect(resolvePropertyFilters({ eventPropertyKey: "plan", eventPropertyValue: "pro" })).toEqual([
      { key: "plan", value: "pro" },
    ]);
  });

  it("keeps falsy-but-defined legacy values", () => {
    expect(resolvePropertyFilters({ eventPropertyKey: "count", eventPropertyValue: 0 })).toEqual([
      { key: "count", value: 0 },
    ]);
    expect(resolvePropertyFilters({ eventPropertyKey: "optedIn", eventPropertyValue: false })).toEqual([
      { key: "optedIn", value: false },
    ]);
    expect(resolvePropertyFilters({ eventPropertyKey: "note", eventPropertyValue: "" })).toEqual([
      { key: "note", value: "" },
    ]);
  });

  it("drops a legacy key with no value, and a legacy value with no key", () => {
    expect(resolvePropertyFilters({ eventPropertyKey: "plan" })).toEqual([]);
    expect(resolvePropertyFilters({ eventPropertyValue: "pro" })).toEqual([]);
    expect(resolvePropertyFilters({ eventPropertyKey: "", eventPropertyValue: "pro" })).toEqual([]);
  });
});

describe("buildPageCondition", () => {
  it("matches a literal path with no filters", () => {
    expect(buildPageCondition("/pricing", [])).toBe("type = 'pageview' AND match(pathname, '^/pricing$')");
  });

  it("expands a single wildcard to one path segment", () => {
    expect(buildPageCondition("/blog/*", [])).toBe("type = 'pageview' AND match(pathname, '^/blog/[^/]+$')");
  });

  it("expands a double wildcard across path segments", () => {
    expect(buildPageCondition("/docs/**", [])).toBe("type = 'pageview' AND match(pathname, '^/docs/.*$')");
  });

  it("escapes regex metacharacters in the path pattern", () => {
    expect(buildPageCondition("/a.b+c", [])).toBe("type = 'pageview' AND match(pathname, '^/a\\\\.b\\\\+c$')");
  });

  it("matches property filters against url_parameters, not props", () => {
    expect(buildPageCondition("/pricing", [{ key: "utm_source", value: "google" }])).toBe(
      "type = 'pageview' AND match(pathname, '^/pricing$') AND url_parameters['utm_source'] = 'google'"
    );
  });

  it("AND-joins multiple url parameter filters in order", () => {
    expect(
      buildPageCondition("/pricing", [
        { key: "utm_source", value: "google" },
        { key: "utm_medium", value: "cpc" },
      ])
    ).toBe(
      "type = 'pageview' AND match(pathname, '^/pricing$') AND url_parameters['utm_source'] = 'google' AND url_parameters['utm_medium'] = 'cpc'"
    );
  });

  it("stringifies non-string url parameter values", () => {
    // Page targets compare url_parameters (always strings) so numbers and
    // booleans are String()-ed into quoted literals rather than emitted bare.
    expect(buildPageCondition("/pricing", [{ key: "n", value: 42 }])).toBe(
      "type = 'pageview' AND match(pathname, '^/pricing$') AND url_parameters['n'] = '42'"
    );
    expect(buildPageCondition("/pricing", [{ key: "b", value: true }])).toBe(
      "type = 'pageview' AND match(pathname, '^/pricing$') AND url_parameters['b'] = 'true'"
    );
  });

  it("escapes quotes in the path pattern so a pattern cannot break out of the literal", () => {
    expect(buildPageCondition("/a') OR 1=1--", [])).toBe(
      "type = 'pageview' AND match(pathname, '^/a\\'\\\\) OR 1=1--$')"
    );
  });

  it("escapes quotes in url parameter filter keys and values", () => {
    expect(buildPageCondition("/x", [{ key: "k'ey", value: "v') OR 1=1--" }])).toBe(
      "type = 'pageview' AND match(pathname, '^/x$') AND url_parameters['k\\'ey'] = 'v\\') OR 1=1--'"
    );
  });

  it("escapes backslashes in filter values", () => {
    expect(buildPageCondition("/x", [{ key: "p", value: "a\\b" }])).toBe(
      "type = 'pageview' AND match(pathname, '^/x$') AND url_parameters['p'] = 'a\\\\b'"
    );
  });

  it("does not let a user-supplied double-star marker survive into the regex", () => {
    // The {{DOUBLE_STAR}} sentinel is escaped before substitution, so a literal
    // one in the pattern stays literal.
    expect(buildPageCondition("/{{DOUBLE_STAR}}", [])).toBe(
      "type = 'pageview' AND match(pathname, '^/\\\\{\\\\{DOUBLE_STAR\\\\}\\\\}$')"
    );
  });
});

describe("buildEventCondition", () => {
  it("matches a custom event by name with no filters", () => {
    expect(buildEventCondition("signup", [])).toBe("type = 'custom_event' AND event_name = 'signup'");
  });

  it("matches a string property filter against props", () => {
    expect(buildEventCondition("purchase", [{ key: "plan", value: "pro" }])).toBe(
      "type = 'custom_event' AND event_name = 'purchase' AND JSONExtractString(toString(props), 'plan') = 'pro'"
    );
  });

  it("compares numeric property filters as floats with an unquoted literal", () => {
    expect(buildEventCondition("purchase", [{ key: "amount", value: 42 }])).toBe(
      "type = 'custom_event' AND event_name = 'purchase' AND toFloat64(JSONExtractString(toString(props), 'amount')) = 42"
    );
    expect(buildEventCondition("purchase", [{ key: "amount", value: 9.5 }])).toBe(
      "type = 'custom_event' AND event_name = 'purchase' AND toFloat64(JSONExtractString(toString(props), 'amount')) = 9.5"
    );
  });

  it("compares boolean property filters against the strings 'true' and 'false'", () => {
    expect(buildEventCondition("purchase", [{ key: "gift", value: true }])).toBe(
      "type = 'custom_event' AND event_name = 'purchase' AND JSONExtractString(toString(props), 'gift') = 'true'"
    );
    expect(buildEventCondition("purchase", [{ key: "gift", value: false }])).toBe(
      "type = 'custom_event' AND event_name = 'purchase' AND JSONExtractString(toString(props), 'gift') = 'false'"
    );
  });

  it("AND-joins multiple property filters in order", () => {
    expect(
      buildEventCondition("purchase", [
        { key: "plan", value: "pro" },
        { key: "seats", value: 3 },
      ])
    ).toBe(
      "type = 'custom_event' AND event_name = 'purchase' AND JSONExtractString(toString(props), 'plan') = 'pro' AND toFloat64(JSONExtractString(toString(props), 'seats')) = 3"
    );
  });

  it("escapes quotes in the event name", () => {
    expect(buildEventCondition("evt'; DROP TABLE events;--", [])).toBe(
      "type = 'custom_event' AND event_name = 'evt\\'; DROP TABLE events;--'"
    );
  });

  it("escapes quotes in property filter keys and values", () => {
    expect(buildEventCondition("evt", [{ key: "k'ey", value: "v'al" }])).toBe(
      "type = 'custom_event' AND event_name = 'evt' AND JSONExtractString(toString(props), 'k\\'ey') = 'v\\'al'"
    );
  });

  it("escapes backslashes in event names and property values", () => {
    expect(buildEventCondition("a\\b", [{ key: "p", value: "c\\d" }])).toBe(
      "type = 'custom_event' AND event_name = 'a\\\\b' AND JSONExtractString(toString(props), 'p') = 'c\\\\d'"
    );
  });

  it("emits an empty quoted literal for an empty event name", () => {
    expect(buildEventCondition("", [])).toBe("type = 'custom_event' AND event_name = ''");
  });
});

describe("buildAutocaptureCondition", () => {
  it("matches the bare event type when no pattern is given", () => {
    expect(buildAutocaptureCondition("outbound", undefined, [])).toBe("type = 'outbound'");
    expect(buildAutocaptureCondition("button_click", undefined, [])).toBe("type = 'button_click'");
    expect(buildAutocaptureCondition("form_submit", undefined, [])).toBe("type = 'form_submit'");
    expect(buildAutocaptureCondition("copy", undefined, [])).toBe("type = 'copy'");
  });

  it("treats an empty or whitespace-only pattern as no pattern", () => {
    expect(buildAutocaptureCondition("outbound", "", [])).toBe("type = 'outbound'");
    expect(buildAutocaptureCondition("outbound", "   ", [])).toBe("type = 'outbound'");
  });

  it("trims the pattern before compiling it", () => {
    expect(buildAutocaptureCondition("copy", "  hello  ", [])).toBe(
      "type = 'copy' AND (match(JSONExtractString(toString(props), 'text'), '^hello$'))"
    );
  });

  it("matches an outbound pattern against the url prop", () => {
    expect(buildAutocaptureCondition("outbound", "https://example.com/*", [])).toBe(
      "type = 'outbound' AND (match(JSONExtractString(toString(props), 'url'), '^https://example\\\\.com/.+$'))"
    );
  });

  it("matches a button_click pattern against the text prop", () => {
    expect(buildAutocaptureCondition("button_click", "Buy now", [])).toBe(
      "type = 'button_click' AND (match(JSONExtractString(toString(props), 'text'), '^Buy now$'))"
    );
  });

  it("ORs a form_submit pattern across all three form props", () => {
    expect(buildAutocaptureCondition("form_submit", "signup", [])).toBe(
      "type = 'form_submit' AND (match(JSONExtractString(toString(props), 'formName'), '^signup$') OR " +
        "match(JSONExtractString(toString(props), 'formId'), '^signup$') OR " +
        "match(JSONExtractString(toString(props), 'formAction'), '^signup$'))"
    );
  });

  it("matches a copy pattern against the text prop", () => {
    expect(buildAutocaptureCondition("copy", "coupon-*", [])).toBe(
      "type = 'copy' AND (match(JSONExtractString(toString(props), 'text'), '^coupon-.+$'))"
    );
  });

  it("lets a single star cross a slash, unlike path patterns", () => {
    // Autocapture values have no path-segment boundary, so '*' compiles to '.+'
    // rather than '[^/]+'.
    expect(buildAutocaptureCondition("outbound", "https://example.com/*", [])).toContain("/.+$");
    expect(buildPageCondition("/a/*", [])).toContain("[^/]+");
  });

  it("compiles a double star to .*", () => {
    expect(buildAutocaptureCondition("copy", "a**b", [])).toBe(
      "type = 'copy' AND (match(JSONExtractString(toString(props), 'text'), '^a.*b$'))"
    );
  });

  it("escapes regex metacharacters in the pattern", () => {
    expect(buildAutocaptureCondition("copy", "a.b(c)", [])).toBe(
      "type = 'copy' AND (match(JSONExtractString(toString(props), 'text'), '^a\\\\.b\\\\(c\\\\)$'))"
    );
  });

  it("appends property filters after the pattern clause", () => {
    expect(buildAutocaptureCondition("outbound", "https://x.com", [{ key: "target", value: "_blank" }])).toBe(
      "type = 'outbound' AND (match(JSONExtractString(toString(props), 'url'), '^https://x\\\\.com$'))" +
        " AND JSONExtractString(toString(props), 'target') = '_blank'"
    );
  });

  it("applies property filters with no pattern", () => {
    expect(
      buildAutocaptureCondition("button_click", undefined, [
        { key: "id", value: "cta" },
        { key: "count", value: 2 },
      ])
    ).toBe(
      "type = 'button_click' AND JSONExtractString(toString(props), 'id') = 'cta'" +
        " AND toFloat64(JSONExtractString(toString(props), 'count')) = 2"
    );
  });

  it("escapes quotes in the pattern so it cannot break out of the literal", () => {
    expect(buildAutocaptureCondition("copy", "a') OR 1=1--", [])).toBe(
      "type = 'copy' AND (match(JSONExtractString(toString(props), 'text'), '^a\\'\\\\) OR 1=1--$'))"
    );
  });

  it("escapes backslashes in the pattern", () => {
    expect(buildAutocaptureCondition("copy", "a\\b", [])).toBe(
      "type = 'copy' AND (match(JSONExtractString(toString(props), 'text'), '^a\\\\\\\\b$'))"
    );
  });

  it("does not let a user-supplied double-star marker survive into the regex", () => {
    expect(buildAutocaptureCondition("copy", "{{DOUBLE_STAR}}", [])).toBe(
      "type = 'copy' AND (match(JSONExtractString(toString(props), 'text'), '^\\\\{\\\\{DOUBLE_STAR\\\\}\\\\}$'))"
    );
  });
});
