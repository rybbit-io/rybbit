import { describe, expect, it } from "vitest";
import {
  filterParamSchema,
  validateFilters,
  validateHttpTimeParams,
  validateTimeStatementFillParams,
  validateTimeStatementParams,
} from "./query-validation.js";

// =============================================================================
// validateHttpTimeParams
// =============================================================================

describe("validateHttpTimeParams", () => {
  it("returns null when no time params are present (all-time mode)", () => {
    expect(validateHttpTimeParams({})).toBeNull();
    expect(validateHttpTimeParams({ site: "1", filters: "[]" })).toBeNull();
  });

  it("returns null for non-object queries (treated as empty)", () => {
    expect(validateHttpTimeParams(undefined)).toBeNull();
    expect(validateHttpTimeParams(null)).toBeNull();
    expect(validateHttpTimeParams("start_date=2025-01-01")).toBeNull();
  });

  it("treats empty-string params as absent (dashboard sends start_date=&end_date=)", () => {
    expect(validateHttpTimeParams({ start_date: "", end_date: "" })).toBeNull();
    expect(
      validateHttpTimeParams({
        start_date: "",
        end_date: "",
        time_zone: "",
        start_datetime: "",
        end_datetime: "",
        past_minutes_start: "",
        past_minutes_end: "",
      })
    ).toBeNull();
  });

  it("errors when an empty string unpairs a real value", () => {
    // start_date="" is stripped as absent, so end_date is now unpaired
    expect(validateHttpTimeParams({ start_date: "", end_date: "2025-01-31" })).toBe(
      "start_date and end_date must be provided together"
    );
  });

  describe("date range params", () => {
    it("accepts a valid start_date/end_date pair with time_zone", () => {
      expect(
        validateHttpTimeParams({ start_date: "2025-01-01", end_date: "2025-01-31", time_zone: "America/New_York" })
      ).toBeNull();
    });

    it("errors on an unpaired start_date or end_date", () => {
      expect(validateHttpTimeParams({ start_date: "2025-01-01" })).toBe(
        "start_date and end_date must be provided together"
      );
      expect(validateHttpTimeParams({ end_date: "2025-01-31" })).toBe(
        "start_date and end_date must be provided together"
      );
    });

    it("errors on a malformed date format", () => {
      expect(validateHttpTimeParams({ start_date: "01/01/2025", end_date: "2025-01-31" })).toBe(
        "Invalid start_date format. Use YYYY-MM-DD"
      );
      expect(validateHttpTimeParams({ start_date: "2025-01-01", end_date: "2025-1-31" })).toBe(
        "Invalid end_date format. Use YYYY-MM-DD"
      );
    });

    it("errors on a well-formatted but impossible date", () => {
      // Matches the regex but Date.parse yields NaN
      expect(validateHttpTimeParams({ start_date: "2025-13-45", end_date: "2025-01-31" })).toBe(
        "Invalid start_date value"
      );
    });
  });

  describe("time_zone", () => {
    it("accepts a valid IANA time zone on its own", () => {
      expect(validateHttpTimeParams({ time_zone: "Asia/Tokyo" })).toBeNull();
      expect(validateHttpTimeParams({ time_zone: "UTC" })).toBeNull();
    });

    it("rejects an invalid time zone", () => {
      expect(validateHttpTimeParams({ time_zone: "Not/AZone" })).toBe("Invalid time_zone");
    });
  });

  describe("datetime range params", () => {
    it("accepts space- and T-separated datetimes, with or without zone suffix", () => {
      expect(
        validateHttpTimeParams({ start_datetime: "2025-01-01 00:00:00", end_datetime: "2025-01-02 00:00:00" })
      ).toBeNull();
      expect(
        validateHttpTimeParams({ start_datetime: "2025-01-01T00:00:00Z", end_datetime: "2025-01-02T00:00:00Z" })
      ).toBeNull();
      expect(
        validateHttpTimeParams({
          start_datetime: "2025-01-01T00:00:00+05:00",
          end_datetime: "2025-01-02T00:00:00+0500",
        })
      ).toBeNull();
    });

    it("errors on an unpaired datetime", () => {
      expect(validateHttpTimeParams({ start_datetime: "2025-01-01 00:00:00" })).toBe(
        "start_datetime and end_datetime must be provided together"
      );
    });

    it("errors on a malformed datetime", () => {
      expect(validateHttpTimeParams({ start_datetime: "2025-01-01", end_datetime: "2025-01-02 00:00:00" })).toBe(
        "Invalid start_datetime format. Use YYYY-MM-DD HH:mm:ss"
      );
    });

    it("requires start_datetime strictly before end_datetime", () => {
      expect(
        validateHttpTimeParams({ start_datetime: "2025-01-02 00:00:00", end_datetime: "2025-01-01 00:00:00" })
      ).toBe("start_datetime must be before end_datetime");
      // Equal timestamps are also rejected
      expect(
        validateHttpTimeParams({ start_datetime: "2025-01-01 00:00:00", end_datetime: "2025-01-01 00:00:00" })
      ).toBe("start_datetime must be before end_datetime");
    });
  });

  describe("past minutes params", () => {
    it("accepts start > end (start = older, end = newer), as strings or numbers", () => {
      expect(validateHttpTimeParams({ past_minutes_start: "60", past_minutes_end: "0" })).toBeNull();
      expect(validateHttpTimeParams({ past_minutes_start: 1440, past_minutes_end: 30 })).toBeNull();
    });

    it("errors on an unpaired past_minutes param", () => {
      expect(validateHttpTimeParams({ past_minutes_start: "60" })).toBe(
        "past_minutes_start and past_minutes_end must be provided together"
      );
      expect(validateHttpTimeParams({ past_minutes_end: "0" })).toBe(
        "past_minutes_start and past_minutes_end must be provided together"
      );
    });

    it("errors when start is not strictly greater than end", () => {
      const message = "past_minutes_start must be greater than past_minutes_end (start = older, end = newer)";
      expect(validateHttpTimeParams({ past_minutes_start: "30", past_minutes_end: "60" })).toBe(message);
      expect(validateHttpTimeParams({ past_minutes_start: "60", past_minutes_end: "60" })).toBe(message);
    });

    it("errors on negative or non-numeric values", () => {
      // A negative end still satisfies the ordering refine, so only the
      // non-negative message fires here.
      expect(validateHttpTimeParams({ past_minutes_start: "60", past_minutes_end: "-5" })).toBe(
        "past_minutes values must be non-negative numbers"
      );
      // A negative/NaN start also fails the ordering refine, so both fire.
      expect(validateHttpTimeParams({ past_minutes_start: "-5", past_minutes_end: "0" })).toContain(
        "past_minutes values must be non-negative numbers"
      );
      expect(validateHttpTimeParams({ past_minutes_start: "abc", past_minutes_end: "0" })).toContain(
        "past_minutes values must be non-negative numbers"
      );
    });
  });

  it("joins multiple issues with a semicolon", () => {
    const result = validateHttpTimeParams({ start_date: "bogus", past_minutes_start: "60" });
    // "bogus" fails both the regex check and the Date.parse refine, so the
    // format and value messages both appear.
    expect(result).toBe(
      "Invalid start_date format. Use YYYY-MM-DD; " +
        "Invalid start_date value; " +
        "start_date and end_date must be provided together; " +
        "past_minutes_start and past_minutes_end must be provided together"
    );
  });
});

// =============================================================================
// validateTimeStatementParams
// =============================================================================

describe("validateTimeStatementParams", () => {
  const ALL_UNDEFINED = { date: undefined, dateTimeRange: undefined, pastMinutesRange: undefined };

  it("accepts a valid date object", () => {
    const params = { date: { start_date: "2025-01-01", end_date: "2025-01-31", time_zone: "UTC" } };
    expect(validateTimeStatementParams(params)).toEqual(params);
  });

  it("accepts a valid dateTimeRange", () => {
    const params = { dateTimeRange: { start_datetime: "2025-01-01 00:00:00", end_datetime: "2025-01-02 00:00:00" } };
    expect(validateTimeStatementParams(params)).toEqual(params);
  });

  it("accepts a valid pastMinutesRange where start is older (greater) than end", () => {
    const params = { pastMinutesRange: { start: 60, end: 0 } };
    expect(validateTimeStatementParams(params)).toEqual(params);
  });

  // PINNED BEHAVIOR: timeStatementParamsSchema ends in .catch({...}), so ANY
  // invalid input — malformed dates, bad timezones, reversed ranges, even
  // complete garbage — is silently swallowed and replaced with all-undefined
  // fields instead of throwing. Callers (getTimeStatement) treat all-undefined
  // as "no time filter", so invalid input degrades to an all-time query rather
  // than an error. Tests below pin this so a future change is deliberate.
  describe("silently swallows invalid input to all-undefined (.catch)", () => {
    it("empty object (nothing provided) does not throw", () => {
      expect(validateTimeStatementParams({})).toEqual(ALL_UNDEFINED);
    });

    it("non-object garbage does not throw", () => {
      expect(validateTimeStatementParams(null)).toEqual(ALL_UNDEFINED);
      expect(validateTimeStatementParams("garbage")).toEqual(ALL_UNDEFINED);
      expect(validateTimeStatementParams(42)).toEqual(ALL_UNDEFINED);
    });

    it("invalid time zone is swallowed", () => {
      expect(
        validateTimeStatementParams({
          date: { start_date: "2025-01-01", end_date: "2025-01-31", time_zone: "Not/AZone" },
        })
      ).toEqual(ALL_UNDEFINED);
    });

    it("date object missing required time_zone is swallowed", () => {
      expect(
        validateTimeStatementParams({ date: { start_date: "2025-01-01", end_date: "2025-01-31" } })
      ).toEqual(ALL_UNDEFINED);
    });

    it("malformed date strings are swallowed", () => {
      expect(
        validateTimeStatementParams({ date: { start_date: "01/01/2025", end_date: "2025-01-31", time_zone: "UTC" } })
      ).toEqual(ALL_UNDEFINED);
    });

    it("reversed or equal dateTimeRange is swallowed", () => {
      expect(
        validateTimeStatementParams({
          dateTimeRange: { start_datetime: "2025-01-02 00:00:00", end_datetime: "2025-01-01 00:00:00" },
        })
      ).toEqual(ALL_UNDEFINED);
    });

    it("pastMinutesRange with start <= end (wrong ordering) is swallowed", () => {
      expect(validateTimeStatementParams({ pastMinutesRange: { start: 0, end: 60 } })).toEqual(ALL_UNDEFINED);
      expect(validateTimeStatementParams({ pastMinutesRange: { start: 60, end: 60 } })).toEqual(ALL_UNDEFINED);
    });

    it("negative pastMinutesRange values are swallowed", () => {
      expect(validateTimeStatementParams({ pastMinutesRange: { start: -10, end: -20 } })).toEqual(ALL_UNDEFINED);
    });
  });
});

// =============================================================================
// validateTimeStatementFillParams (bucket enum + fill params schema)
// =============================================================================

describe("validateTimeStatementFillParams", () => {
  // Cast: validateTimeStatementFillParams is typed for full FilterParams, but
  // the schema only reads the time-related fields, so partial objects are fine.
  const validDateParams = { start_date: "2025-01-01", end_date: "2025-01-31", time_zone: "UTC" } as never;

  describe("bucket enum", () => {
    it.each(["minute", "five_minutes", "ten_minutes", "fifteen_minutes", "hour", "day", "week", "month", "year"])(
      "accepts bucket %s",
      bucket => {
        const result = validateTimeStatementFillParams(validDateParams, bucket);
        expect(result.bucket).toBe(bucket);
      }
    );

    it("rejects unknown bucket values", () => {
      expect(() => validateTimeStatementFillParams(validDateParams, "quarter")).toThrow();
      expect(() => validateTimeStatementFillParams(validDateParams, undefined)).toThrow();
    });
  });

  it("defaults a missing time_zone to UTC instead of dropping the range", () => {
    const result = validateTimeStatementFillParams(
      { start_date: "2025-01-01", end_date: "2025-01-31" } as never,
      "day"
    );
    expect(result.params.time_zone).toBe("UTC");
    expect(result.params.start_date).toBe("2025-01-01");
  });

  it("coerces string past_minutes params to numbers", () => {
    const result = validateTimeStatementFillParams(
      { past_minutes_start: "60", past_minutes_end: "0" } as never,
      "minute"
    );
    expect(result.params.past_minutes_start).toBe(60);
    expect(result.params.past_minutes_end).toBe(0);
  });

  it("throws when past_minutes_start is not greater than past_minutes_end", () => {
    expect(() =>
      validateTimeStatementFillParams({ past_minutes_start: "0", past_minutes_end: "60" } as never, "minute")
    ).toThrow(/greater than/);
  });

  it("throws when no complete time param group is provided", () => {
    expect(() => validateTimeStatementFillParams({} as never, "day")).toThrow(/must be provided/);
    // start_date alone (no end_date) is not a complete group
    expect(() => validateTimeStatementFillParams({ start_date: "2025-01-01" } as never, "day")).toThrow(
      /must be provided/
    );
  });

  it("silently turns a non-numeric past_minutes string into undefined, then fails the group check", () => {
    // PINNED: the transform maps NaN to undefined rather than erroring, so the
    // failure surfaces as the "must be provided" refinement, not a type error.
    expect(() =>
      validateTimeStatementFillParams({ past_minutes_start: "abc", past_minutes_end: "0" } as never, "minute")
    ).toThrow(/must be provided/);
  });
});

// =============================================================================
// validateFilters
// =============================================================================

describe("validateFilters", () => {
  it("parses a valid filters array", () => {
    const filters = [{ parameter: "browser", type: "equals", value: ["Chrome"] }];
    expect(validateFilters(JSON.stringify(filters))).toEqual(filters);
  });

  it("accepts an empty array", () => {
    expect(validateFilters("[]")).toEqual([]);
  });

  it("accepts mixed string and number values", () => {
    const filters = [{ parameter: "lat", type: "greater_than", value: [45.5, "46"] }];
    expect(validateFilters(JSON.stringify(filters))).toEqual(filters);
  });

  it("throws 'Invalid JSON format' on malformed JSON", () => {
    expect(() => validateFilters("not json")).toThrow("Invalid JSON format");
    expect(() => validateFilters("[{")).toThrow("Invalid JSON format");
  });

  it("throws when the JSON is not an array", () => {
    expect(() => validateFilters('{"parameter":"browser","type":"equals","value":["x"]}')).toThrow();
  });

  it("throws on an unknown filter parameter", () => {
    expect(() =>
      validateFilters(JSON.stringify([{ parameter: "password", type: "equals", value: ["x"] }]))
    ).toThrow();
  });

  it("throws on an unknown filter type", () => {
    expect(() => validateFilters(JSON.stringify([{ parameter: "browser", type: "like", value: ["x"] }]))).toThrow();
  });

  it("throws when value is not an array of strings/numbers", () => {
    expect(() => validateFilters(JSON.stringify([{ parameter: "browser", type: "equals", value: "Chrome" }]))).toThrow();
    expect(() =>
      validateFilters(JSON.stringify([{ parameter: "browser", type: "equals", value: [true] }]))
    ).toThrow();
  });

  it("accepts feature_flag filter parameters", () => {
    const filters = [{ parameter: "feature_flag:new_checkout", type: "equals", value: ["true"] }];
    expect(validateFilters(JSON.stringify(filters))).toEqual(filters);
  });
});

// =============================================================================
// filterParamSchema (feature_flag regex + union)
// =============================================================================

describe("filterParamSchema", () => {
  it("accepts base filter parameters", () => {
    expect(filterParamSchema.safeParse("browser").success).toBe(true);
    expect(filterParamSchema.safeParse("pathname").success).toBe(true);
    expect(filterParamSchema.safeParse("utm_source").success).toBe(true);
    expect(filterParamSchema.safeParse("tag").success).toBe(true);
  });

  it("rejects strings outside the base enum", () => {
    expect(filterParamSchema.safeParse("screen_class").success).toBe(false);
    expect(filterParamSchema.safeParse("").success).toBe(false);
    expect(filterParamSchema.safeParse("BROWSER").success).toBe(false);
  });

  it("rejects url_param: parameters (handled elsewhere, not part of this schema)", () => {
    expect(filterParamSchema.safeParse("url_param:campaign_id").success).toBe(false);
  });

  describe("feature_flag: regex", () => {
    it("accepts flag keys starting with a letter, using the allowed charset", () => {
      expect(filterParamSchema.safeParse("feature_flag:new_checkout").success).toBe(true);
      expect(filterParamSchema.safeParse("feature_flag:A").success).toBe(true);
      expect(filterParamSchema.safeParse("feature_flag:my.flag:v2-x_1").success).toBe(true);
    });

    it("accepts a flag key of exactly 100 characters", () => {
      expect(filterParamSchema.safeParse(`feature_flag:a${"b".repeat(99)}`).success).toBe(true);
    });

    it("rejects a flag key longer than 100 characters", () => {
      expect(filterParamSchema.safeParse(`feature_flag:a${"b".repeat(100)}`).success).toBe(false);
    });

    it("rejects an empty flag key", () => {
      expect(filterParamSchema.safeParse("feature_flag:").success).toBe(false);
    });

    it("rejects flag keys starting with a digit or containing invalid characters", () => {
      expect(filterParamSchema.safeParse("feature_flag:1abc").success).toBe(false);
      expect(filterParamSchema.safeParse("feature_flag:has space").success).toBe(false);
      expect(filterParamSchema.safeParse("feature_flag:x'; DROP").success).toBe(false);
      expect(filterParamSchema.safeParse("feature_flag:flag\n").success).toBe(false);
    });
  });
});
