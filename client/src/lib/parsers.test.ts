import { Filter } from "@rybbit/shared";
import { describe, expect, it } from "vitest";
import { Time } from "@/components/DateSelector/types";
import {
  analyticsParsers,
  appSumoCallbackParsers,
  invitationParsers,
  parseAsFilters,
  parseAsStatType,
  parseAsStringArray,
  parseAsTimeBucket,
  parseAsTimeMode,
  parseAsWellKnown,
} from "./parsers";
import { timeToUrlParams } from "./time";

describe("parseAsFilters", () => {
  const chrome: Filter = { parameter: "browser", type: "equals", value: ["Chrome"] };

  it("round-trips a filter through the query string", () => {
    const serialized = parseAsFilters.serialize([chrome]);

    expect(parseAsFilters.parse(serialized)).toEqual([chrome]);
  });

  it("accepts every filter type and parameter it declares", () => {
    const filters: Filter[] = [
      { parameter: "pathname", type: "contains", value: ["/blog"] },
      { parameter: "country", type: "not_equals", value: ["US", "CA"] },
      { parameter: "referrer", type: "is_null", value: [] },
      { parameter: "lat", type: "greater_than_or_equal", value: [37.7] },
      { parameter: "utm_source", type: "not_regex", value: ["^spam"] },
      { parameter: "timezone", type: "ends_with", value: ["Tokyo"] },
    ];

    expect(parseAsFilters.parse(parseAsFilters.serialize(filters))).toEqual(filters);
  });

  it("keeps numeric filter values alongside strings", () => {
    const mixed = [{ parameter: "lon", type: "less_than", value: ["-122", -122.4] }] as unknown as Filter[];

    expect(parseAsFilters.parse(JSON.stringify(mixed))).toEqual(mixed);
  });

  it("drops entries with an unknown parameter or type instead of failing the whole list", () => {
    const parsed = parseAsFilters.parse(
      JSON.stringify([
        { parameter: "not_a_column", type: "equals", value: ["x"] },
        { parameter: "browser", type: "sounds_like", value: ["x"] },
        chrome,
      ])
    );

    expect(parsed).toEqual([chrome]);
  });

  it("drops entries whose value is missing, not an array, or holds non-primitives", () => {
    const parsed = parseAsFilters.parse(
      JSON.stringify([
        { parameter: "browser", type: "equals" },
        { parameter: "browser", type: "equals", value: "Chrome" },
        { parameter: "browser", type: "equals", value: [{ nested: true }] },
        { parameter: "browser", type: "equals", value: [null] },
        chrome,
      ])
    );

    expect(parsed).toEqual([chrome]);
  });

  it("drops non-object entries", () => {
    expect(parseAsFilters.parse(JSON.stringify([null, "browser", 7, [], chrome]))).toEqual([chrome]);
  });

  it("yields an empty list when the payload is valid json but not an array", () => {
    expect(parseAsFilters.parse('{"parameter":"browser"}')).toEqual([]);
    expect(parseAsFilters.parse('"browser"')).toEqual([]);
    expect(parseAsFilters.parse("[]")).toEqual([]);
  });

  it("yields null when the payload is not json at all", () => {
    expect(parseAsFilters.parse("browser=Chrome")).toBeNull();
    expect(parseAsFilters.parse("")).toBeNull();
  });
});

describe("parseAsStringArray", () => {
  it("round-trips a string array", () => {
    expect(parseAsStringArray.parse(parseAsStringArray.serialize(["a", "b"]))).toEqual(["a", "b"]);
  });

  it("does not validate its contents — anything json-shaped comes back as-is", () => {
    expect(parseAsStringArray.parse("[1,2]")).toEqual([1, 2]);
    expect(parseAsStringArray.parse('{"a":1}')).toEqual({ a: 1 });
  });
});

describe("enum parsers", () => {
  it.each(["minute", "five_minutes", "ten_minutes", "fifteen_minutes", "hour", "day", "week", "month", "year"])(
    "accepts the %s bucket",
    value => {
      expect(parseAsTimeBucket.parse(value)).toBe(value);
    }
  );

  it("rejects buckets outside the allowed set, including by case", () => {
    expect(parseAsTimeBucket.parse("fortnight")).toBeNull();
    expect(parseAsTimeBucket.parse("Hour")).toBeNull();
    expect(parseAsTimeBucket.parse("")).toBeNull();
  });

  it.each(["pageviews", "sessions", "users", "pages_per_session", "bounce_rate", "session_duration"])(
    "accepts the %s stat",
    value => {
      expect(parseAsStatType.parse(value)).toBe(value);
    }
  );

  it("rejects unknown stats", () => {
    expect(parseAsStatType.parse("revenue")).toBeNull();
  });

  it.each(["day", "range", "week", "month", "year", "all-time", "past-minutes"])("accepts the %s time mode", value => {
    expect(parseAsTimeMode.parse(value)).toBe(value);
  });

  it("rejects unknown time modes", () => {
    expect(parseAsTimeMode.parse("quarter")).toBeNull();
  });

  it("accepts the dashboard presets and rejects anything else", () => {
    expect(parseAsWellKnown.parse("last-7-days")).toBe("last-7-days");
    expect(parseAsWellKnown.parse("today")).toBe("today");
    expect(parseAsWellKnown.parse("last-3-fortnights")).toBeNull();
  });
});

describe("analyticsParsers", () => {
  it("has a parser for every param timeToUrlParams can write", () => {
    const times: Time[] = [
      { mode: "day", day: "2024-03-15" },
      { mode: "day", day: "2024-03-15", wellKnown: "today" },
      { mode: "range", startDate: "2024-03-01", endDate: "2024-03-14" },
      { mode: "range", startDate: "2024-03-01", endDate: "2024-03-14", startTime: "08:00:00", endTime: "17:00:00" },
      { mode: "week", week: "2024-03-11" },
      { mode: "month", month: "2024-03-01" },
      { mode: "year", year: "2024-01-01" },
      { mode: "past-minutes", pastMinutesStart: 30, pastMinutesEnd: 0 },
      { mode: "all-time" },
    ];

    const written = new Set(times.flatMap(time => Object.keys(timeToUrlParams(time))));

    expect(written.size).toBeGreaterThan(0);
    for (const key of written) {
      expect(analyticsParsers, key).toHaveProperty(key);
    }
  });

  it("parses the display and feature-flag params", () => {
    expect(analyticsParsers.bucket.parse("day")).toBe("day");
    expect(analyticsParsers.stat.parse("sessions")).toBe("sessions");
    expect(analyticsParsers.embed.parse("true")).toBe(true);
    expect(analyticsParsers.hideSidebar.parse("false")).toBe(false);
    expect(analyticsParsers.past_minutes_start.parse("30")).toBe(30);
    expect(analyticsParsers.past_minutes_end.parse("abc")).toBeNull();
  });

  it("leaves date params as opaque strings", () => {
    expect(analyticsParsers.day.parse("2024-03-15")).toBe("2024-03-15");
    expect(analyticsParsers.startDate.parse("whenever")).toBe("whenever");
  });
});

describe("callback parsers", () => {
  it("reads invitation params as strings", () => {
    expect(invitationParsers.organization.parse("acme")).toBe("acme");
    expect(invitationParsers.inviterEmail.parse("a@b.com")).toBe("a@b.com");
    expect(invitationParsers.invitationId.parse("inv_1")).toBe("inv_1");
  });

  it("reads the AppSumo step as an integer", () => {
    expect(appSumoCallbackParsers.code.parse("abc123")).toBe("abc123");
    expect(appSumoCallbackParsers.step.parse("2")).toBe(2);
    expect(appSumoCallbackParsers.step.parse("two")).toBeNull();
  });
});
