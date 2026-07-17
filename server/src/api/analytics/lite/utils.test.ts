import { FilterParams } from "@rybbit/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TimeBucket } from "../types.js";
import {
  getLiteFillClause,
  getLiteSessionFilter,
  getLiteTimeStatement,
  hasLiteFilters,
  liteBucket,
  wrapLiteLikeValue,
} from "./utils.js";

vi.mock("../../../db/postgres/postgres.js", () => ({
  db: {},
  sql: {},
}));

const normalize = (sql: string) => sql.replace(/\s+/g, " ").trim();

const filtersOf = (filters: object[]) => JSON.stringify(filters);

const params = (overrides: Partial<FilterParams>) => overrides as FilterParams;

describe("getLiteSessionFilter", () => {
  describe("empty inputs", () => {
    it("should support undefined filters with empty sql", () => {
      expect(getLiteSessionFilter(undefined)).toEqual({ supported: true, sql: "" });
    });

    it("should support an empty filter array with empty sql", () => {
      expect(getLiteSessionFilter("[]")).toEqual({ supported: true, sql: "" });
    });

    it("should throw for invalid JSON", () => {
      expect(() => getLiteSessionFilter("not json")).toThrow("Invalid JSON format");
    });
  });

  describe("supported vs unsupported columns", () => {
    it("should support every sessions_mv column", () => {
      for (const parameter of ["country", "region", "device_type", "browser", "operating_system", "hostname"]) {
        const result = getLiteSessionFilter(filtersOf([{ parameter, type: "equals", value: ["x"] }]));
        expect(result).toEqual({ supported: true, sql: `AND ${parameter} = 'x'` });
      }
    });

    it("should fall back for columns not on the session rollup", () => {
      for (const parameter of ["pathname", "page_title", "referrer", "channel", "entry_page", "utm_source"]) {
        const result = getLiteSessionFilter(filtersOf([{ parameter, type: "equals", value: ["x"] }]));
        expect(result).toEqual({ supported: false, sql: "" });
      }
    });

    it("should fall back when any one filter is unsupported", () => {
      const result = getLiteSessionFilter(
        filtersOf([
          { parameter: "country", type: "equals", value: ["US"] },
          { parameter: "pathname", type: "equals", value: ["/home"] },
        ])
      );
      expect(result).toEqual({ supported: false, sql: "" });
    });

    it("should fall back for operators outside the lite map", () => {
      for (const type of ["regex", "not_regex", "greater_than", "less_than"]) {
        const result = getLiteSessionFilter(filtersOf([{ parameter: "country", type, value: ["US"] }]));
        expect(result).toEqual({ supported: false, sql: "" });
      }
    });

    it("should fall back for an empty value array", () => {
      const result = getLiteSessionFilter(filtersOf([{ parameter: "country", type: "equals", value: [] }]));
      expect(result).toEqual({ supported: false, sql: "" });
    });
  });

  describe("operators", () => {
    it("should handle equals", () => {
      const result = getLiteSessionFilter(filtersOf([{ parameter: "country", type: "equals", value: ["US"] }]));
      expect(result).toEqual({ supported: true, sql: "AND country = 'US'" });
    });

    it("should handle not_equals", () => {
      const result = getLiteSessionFilter(filtersOf([{ parameter: "country", type: "not_equals", value: ["US"] }]));
      expect(result).toEqual({ supported: true, sql: "AND country != 'US'" });
    });

    it("should handle contains", () => {
      const result = getLiteSessionFilter(filtersOf([{ parameter: "browser", type: "contains", value: ["Chr"] }]));
      expect(result).toEqual({ supported: true, sql: "AND browser LIKE '%Chr%'" });
    });

    it("should handle not_contains", () => {
      const result = getLiteSessionFilter(filtersOf([{ parameter: "browser", type: "not_contains", value: ["bot"] }]));
      expect(result).toEqual({ supported: true, sql: "AND browser NOT LIKE '%bot%'" });
    });

    it("should handle starts_with", () => {
      const result = getLiteSessionFilter(filtersOf([{ parameter: "hostname", type: "starts_with", value: ["app."] }]));
      expect(result).toEqual({ supported: true, sql: "AND hostname LIKE 'app.%'" });
    });

    it("should handle ends_with", () => {
      const result = getLiteSessionFilter(filtersOf([{ parameter: "hostname", type: "ends_with", value: [".dev"] }]));
      expect(result).toEqual({ supported: true, sql: "AND hostname LIKE '%.dev'" });
    });

    it("should handle is_null as NULL-or-empty", () => {
      const result = getLiteSessionFilter(filtersOf([{ parameter: "region", type: "is_null", value: [] }]));
      expect(result).toEqual({ supported: true, sql: "AND (region IS NULL OR region = '')" });
    });

    it("should handle is_not_null as not-NULL-and-not-empty", () => {
      const result = getLiteSessionFilter(filtersOf([{ parameter: "region", type: "is_not_null", value: [] }]));
      expect(result).toEqual({ supported: true, sql: "AND (region IS NOT NULL AND region != '')" });
    });
  });

  describe("multi-value joining", () => {
    it("should OR-join positive filters", () => {
      const result = getLiteSessionFilter(filtersOf([{ parameter: "country", type: "equals", value: ["US", "DE"] }]));
      expect(result).toEqual({ supported: true, sql: "AND (country = 'US' OR country = 'DE')" });
    });

    it("should AND-join not_equals values to avoid the OR tautology", () => {
      const result = getLiteSessionFilter(
        filtersOf([{ parameter: "country", type: "not_equals", value: ["US", "DE"] }])
      );
      expect(result).toEqual({ supported: true, sql: "AND (country != 'US' AND country != 'DE')" });
    });

    it("should AND-join not_contains values", () => {
      const result = getLiteSessionFilter(
        filtersOf([{ parameter: "browser", type: "not_contains", value: ["bot", "spider"] }])
      );
      expect(result).toEqual({
        supported: true,
        sql: "AND (browser NOT LIKE '%bot%' AND browser NOT LIKE '%spider%')",
      });
    });

    it("should not parenthesize single values", () => {
      const result = getLiteSessionFilter(filtersOf([{ parameter: "country", type: "equals", value: ["US"] }]));
      expect(result.sql).toBe("AND country = 'US'");
    });

    it("should AND-join separate filters", () => {
      const result = getLiteSessionFilter(
        filtersOf([
          { parameter: "country", type: "equals", value: ["US"] },
          { parameter: "device_type", type: "equals", value: ["Desktop"] },
        ])
      );
      expect(result).toEqual({ supported: true, sql: "AND country = 'US' AND device_type = 'Desktop'" });
    });
  });

  describe("value escaping", () => {
    it("should escape single quotes", () => {
      const result = getLiteSessionFilter(
        filtersOf([{ parameter: "country", type: "equals", value: ["US'; DROP TABLE events;--"] }])
      );
      expect(result.sql).toBe("AND country = 'US\\'; DROP TABLE events;--'");
    });

    it("should escape quotes inside LIKE wildcards", () => {
      const result = getLiteSessionFilter(filtersOf([{ parameter: "browser", type: "contains", value: ["O'Brien"] }]));
      expect(result.sql).toBe("AND browser LIKE '%O\\'Brien%'");
    });

    it("should stringify numeric values", () => {
      const result = getLiteSessionFilter(filtersOf([{ parameter: "country", type: "equals", value: [42] }]));
      expect(result.sql).toBe("AND country = '42'");
    });
  });
});

describe("getLiteTimeStatement", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("should build a timezone-aware day range against the given column", () => {
    const result = getLiteTimeStatement(
      { start_date: "2024-01-01", end_date: "2024-01-31", time_zone: "America/New_York" },
      "event_hour"
    );

    expect(normalize(result)).toBe(
      normalize(`AND event_hour >= toTimeZone(
        toStartOfDay(toDateTime('2024-01-01', 'America/New_York')),
        'UTC'
      )
      AND event_hour < if(
        toDate('2024-01-31') = toDate(now(), 'America/New_York'),
        toTimeZone(now(), 'UTC'),
        toTimeZone(
          toStartOfDay(toDateTime('2024-01-31', 'America/New_York')) + INTERVAL 1 DAY,
          'UTC'
        )
      )`)
    );
  });

  it("should default a missing time_zone to UTC", () => {
    const result = getLiteTimeStatement(params({ start_date: "2024-01-01", end_date: "2024-01-31" }), "event_hour");
    expect(result).toContain("toDateTime('2024-01-01', 'UTC')");
    expect(result).not.toBe("");
  });

  it("should compute exact timestamps for past minutes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));

    const result = getLiteTimeStatement(params({ past_minutes_start: 120, past_minutes_end: 0 }), "start_time");

    expect(result).toBe(
      "AND start_time > toDateTime('2024-06-15 10:00:00') AND start_time <= toDateTime('2024-06-15 12:00:00')"
    );
  });

  it("should return empty string with no time params", () => {
    expect(getLiteTimeStatement(params({}), "event_hour")).toBe("");
  });

  it("should return empty string when only one date bound is provided", () => {
    expect(getLiteTimeStatement(params({ start_date: "2024-01-01" }), "event_hour")).toBe("");
  });
});

describe("getLiteFillClause", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("should build a date-range fill clause with the bucket fn and interval", () => {
    const result = getLiteFillClause(
      params({ start_date: "2024-01-01", end_date: "2024-01-31", time_zone: "UTC" }),
      "day"
    );

    expect(normalize(result)).toBe(
      normalize(`WITH FILL FROM toTimeZone(
        toDateTime(toStartOfDay(toDateTime('2024-01-01', 'UTC'))),
        'UTC'
      )
      TO if(
        toDate('2024-01-31') = toDate(now(), 'UTC'),
        toTimeZone(now(), 'UTC'),
        toTimeZone(
          toDateTime(toStartOfDay(toDateTime('2024-01-31', 'UTC'))) + INTERVAL 1 DAY,
          'UTC'
        )
      ) STEP INTERVAL 1 DAY`)
    );
  });

  it("should default a missing time_zone to UTC", () => {
    const result = getLiteFillClause(params({ start_date: "2024-01-01", end_date: "2024-01-31" }), "hour");
    expect(result).toContain("toDateTime('2024-01-01', 'UTC')");
    expect(result).toContain("toStartOfHour");
    expect(result).toContain("STEP INTERVAL 1 HOUR");
  });

  it("should build a past-minutes fill clause with exact timestamps", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));

    const result = getLiteFillClause(params({ past_minutes_start: 120, past_minutes_end: 0 }), "hour");

    expect(normalize(result)).toBe(
      normalize(`WITH FILL FROM toStartOfHour(toDateTime('2024-06-15 10:00:00'))
        TO toStartOfHour(toDateTime('2024-06-15 12:00:00')) + INTERVAL 1 HOUR
        STEP INTERVAL 1 HOUR`)
    );
  });

  it("should return empty string with no time params", () => {
    expect(getLiteFillClause(params({}), "hour")).toBe("");
  });
});

describe("liteBucket", () => {
  it("should default undefined to hour", () => {
    expect(liteBucket(undefined)).toBe("hour");
  });

  it("should promote sub-hour buckets to hour", () => {
    for (const bucket of ["minute", "five_minutes", "ten_minutes", "fifteen_minutes"] as TimeBucket[]) {
      expect(liteBucket(bucket)).toBe("hour");
    }
  });

  it("should pass hour and coarser buckets through", () => {
    for (const bucket of ["hour", "day", "week", "month", "year"] as TimeBucket[]) {
      expect(liteBucket(bucket)).toBe(bucket);
    }
  });
});

describe("wrapLiteLikeValue", () => {
  it("should wrap contains and not_contains with both wildcards", () => {
    expect(wrapLiteLikeValue("contains", "blog")).toBe("%blog%");
    expect(wrapLiteLikeValue("not_contains", "blog")).toBe("%blog%");
  });

  it("should append a wildcard for starts_with", () => {
    expect(wrapLiteLikeValue("starts_with", "app.")).toBe("app.%");
  });

  it("should prepend a wildcard for ends_with", () => {
    expect(wrapLiteLikeValue("ends_with", ".dev")).toBe("%.dev");
  });

  it("should pass other types through unwrapped", () => {
    expect(wrapLiteLikeValue("equals", "US")).toBe("US");
    expect(wrapLiteLikeValue("not_equals", "US")).toBe("US");
  });

  it("should stringify numbers", () => {
    expect(wrapLiteLikeValue("contains", 42)).toBe("%42%");
  });

  it("should escape % and _ in user values so they match literally", () => {
    expect(wrapLiteLikeValue("contains", "50%")).toBe("%50\\%%");
    expect(wrapLiteLikeValue("starts_with", "a_b")).toBe("a\\_b%");
  });

  it("should escape backslashes in user values", () => {
    expect(wrapLiteLikeValue("ends_with", "C:\\temp")).toBe("%C:\\\\temp");
  });

  it("should not escape values for non-LIKE types", () => {
    expect(wrapLiteLikeValue("equals", "50%")).toBe("50%");
  });
});

describe("hasLiteFilters", () => {
  it("should return false for undefined or empty string", () => {
    expect(hasLiteFilters(undefined)).toBe(false);
    expect(hasLiteFilters("")).toBe(false);
  });

  it("should return false for an empty filter array", () => {
    expect(hasLiteFilters("[]")).toBe(false);
  });

  it("should return true when at least one valid filter is present", () => {
    expect(hasLiteFilters(filtersOf([{ parameter: "country", type: "equals", value: ["US"] }]))).toBe(true);
  });

  it("should throw for invalid JSON", () => {
    expect(() => hasLiteFilters("not json")).toThrow("Invalid JSON format");
  });
});
