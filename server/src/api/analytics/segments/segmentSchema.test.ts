import { describe, expect, it } from "vitest";
import { createSegmentSchema, segmentFiltersSchema, updateSegmentSchema } from "./segmentSchema.js";

const mobileDe = [
  { parameter: "device_type", type: "equals", value: ["Mobile"] },
  { parameter: "country", type: "equals", value: ["DE"] },
];

describe("segmentFiltersSchema", () => {
  it("accepts every filter shape the filter bar can produce", () => {
    const filters = [
      ...mobileDe,
      { parameter: "pathname", type: "starts_with", value: ["/docs"] },
      { parameter: "user_id", type: "is_not_null", value: [] },
      { parameter: "referrer", type: "regex", value: ["^https://(www\\.)?producthunt\\.com"] },
      { parameter: "lat", type: "greater_than", value: [48.1] },
      { parameter: "feature_flag:new-checkout", type: "equals", value: ["true"] },
      { parameter: "channel", type: "not_equals", value: ["Paid Search", "Paid Social"] },
    ];
    expect(segmentFiltersSchema.parse(filters)).toEqual(filters);
  });

  it("rejects a parameter the ClickHouse layer does not know", () => {
    const result = segmentFiltersSchema.safeParse([{ parameter: "session_id", type: "equals", value: ["x"] }]);
    expect(result.success).toBe(false);
  });

  it("rejects an unknown operator", () => {
    const result = segmentFiltersSchema.safeParse([{ parameter: "browser", type: "like", value: ["Chrome"] }]);
    expect(result.success).toBe(false);
  });

  it("rejects a value-taking operator with no values", () => {
    const result = segmentFiltersSchema.safeParse([{ parameter: "browser", type: "equals", value: [] }]);
    expect(result.success).toBe(false);
    expect(result.success ? "" : result.error.issues[0].message).toContain("at least one value");
  });

  it("allows null checks with no values", () => {
    const result = segmentFiltersSchema.safeParse([{ parameter: "user_id", type: "is_null", value: [] }]);
    expect(result.success).toBe(true);
  });

  it("rejects an invalid regular expression", () => {
    const result = segmentFiltersSchema.safeParse([{ parameter: "pathname", type: "regex", value: ["(unclosed"] }]);
    expect(result.success).toBe(false);
    expect(result.success ? "" : result.error.issues[0].message).toContain("Invalid regular expression");
  });

  it("holds stored regexes to the query path's limits: non-empty, at most 500 chars, RE2-compatible, one pattern", () => {
    const regex = (value: unknown[]) => segmentFiltersSchema.safeParse([{ parameter: "pathname", type: "regex", value }]);
    expect(regex([""]).success).toBe(false);
    expect(regex(["a".repeat(501)]).success).toBe(false);
    expect(regex(["^(?!.*test).*$"]).success).toBe(false);
    expect(regex(["^/docs/(?=guide)"]).success).toBe(false);
    expect(regex(["(a)\\1"]).success).toBe(false);
    expect(regex(["^/a", "^/b"]).success).toBe(false);
    expect(regex(["^/docs/[a-z-]+$"]).success).toBe(true);
  });

  it("rejects non-numeric values on numeric comparisons and coordinates", () => {
    expect(segmentFiltersSchema.safeParse([{ parameter: "lat", type: "equals", value: ["north"] }]).success).toBe(false);
    expect(
      segmentFiltersSchema.safeParse([{ parameter: "browser_version", type: "greater_than", value: ["latest"] }]).success
    ).toBe(false);
  });

  it("rejects values that are neither strings nor numbers", () => {
    const result = segmentFiltersSchema.safeParse([{ parameter: "browser", type: "equals", value: [{ name: "Chrome" }] }]);
    expect(result.success).toBe(false);
  });

  it("requires at least one filter and caps the count", () => {
    expect(segmentFiltersSchema.safeParse([]).success).toBe(false);
    const tooMany = Array.from({ length: 21 }, (_, i) => ({ parameter: "browser", type: "equals", value: [`b${i}`] }));
    expect(segmentFiltersSchema.safeParse(tooMany).success).toBe(false);
  });
});

describe("createSegmentSchema", () => {
  it("trims the name and defaults the optional fields", () => {
    const parsed = createSegmentSchema.parse({ name: "  Mobile DE  ", filters: mobileDe });
    expect(parsed.name).toBe("Mobile DE");
    expect(parsed.isPublic).toBeUndefined();
    expect(parsed.scope).toBeUndefined();
  });

  it("rejects a blank name, an unknown scope, and unknown keys", () => {
    expect(createSegmentSchema.safeParse({ name: "   ", filters: mobileDe }).success).toBe(false);
    expect(createSegmentSchema.safeParse({ name: "x", filters: mobileDe, scope: "team" }).success).toBe(false);
    expect(createSegmentSchema.safeParse({ name: "x", filters: mobileDe, siteId: 4 }).success).toBe(false);
  });

  it("caps name and description length", () => {
    expect(createSegmentSchema.safeParse({ name: "n".repeat(81), filters: mobileDe }).success).toBe(false);
    expect(
      createSegmentSchema.safeParse({ name: "ok", description: "d".repeat(501), filters: mobileDe }).success
    ).toBe(false);
  });
});

describe("updateSegmentSchema", () => {
  it("accepts a partial body but still validates the filters it carries", () => {
    expect(updateSegmentSchema.safeParse({ name: "Renamed" }).success).toBe(true);
    expect(updateSegmentSchema.safeParse({ isPublic: true }).success).toBe(true);
    expect(updateSegmentSchema.safeParse({ filters: [] }).success).toBe(false);
    expect(
      updateSegmentSchema.safeParse({ filters: [{ parameter: "nope", type: "equals", value: ["x"] }] }).success
    ).toBe(false);
  });
});
