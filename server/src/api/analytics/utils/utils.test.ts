import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTimeStatement, normalizeDatetimeForClickhouse, patternToRegex, processResults } from "./utils.js";

vi.mock("../../../db/postgres/postgres.js", () => ({
  db: {},
  sql: {},
}));

const normalize = (sql: string) => sql.replace(/\s+/g, " ").trim();

type TimeParams = Parameters<typeof getTimeStatement>[0];
const getTime = (params: Partial<TimeParams>) => getTimeStatement(params as TimeParams);

const makeResultSet = <T>(rows: T[]) => ({ json: async () => rows }) as unknown as Parameters<typeof processResults>[0];

describe("getTimeStatement", () => {
  describe("date range", () => {
    it("should build a timezone-aware day range from start_date and end_date", () => {
      const result = getTime({
        start_date: "2024-01-01",
        end_date: "2024-01-31",
        time_zone: "America/New_York",
      });

      expect(normalize(result)).toBe(
        normalize(`AND timestamp >= toTimeZone(
          toStartOfDay(toDateTime('2024-01-01', 'America/New_York')),
          'UTC'
          )
          AND timestamp < if(
            toDate('2024-01-31') = toDate(now(), 'America/New_York'),
            toTimeZone(now(), 'UTC'),
            toTimeZone(
              toStartOfDay(toDateTime('2024-01-31', 'America/New_York')) + INTERVAL 1 DAY,
              'UTC'
            )
          )`)
      );
    });

    it("should default a missing time_zone to UTC instead of dropping the range", () => {
      const result = getTime({ start_date: "2024-01-01", end_date: "2024-01-31" });

      expect(result).toContain("toDateTime('2024-01-01', 'UTC')");
      expect(result).toContain("toDateTime('2024-01-31', 'UTC')");
      expect(result).not.toBe("");
    });

    it("should defer the 'today' decision to ClickHouse via if(toDate(end) = toDate(now))", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));

      const result = getTime({
        start_date: "2024-06-15",
        end_date: "2024-06-15",
        time_zone: "UTC",
      });

      expect(normalize(result)).toContain("toDate('2024-06-15') = toDate(now(), 'UTC')");
      expect(normalize(result)).toContain("toTimeZone(now(), 'UTC')");

      vi.useRealTimers();
    });

    it("should take precedence over datetime range and past minutes", () => {
      const result = getTime({
        start_date: "2024-01-01",
        end_date: "2024-01-31",
        time_zone: "UTC",
        start_datetime: "2024-02-01 00:00:00",
        end_datetime: "2024-02-02 00:00:00",
        past_minutes_start: 60,
        past_minutes_end: 0,
      });

      expect(result).toContain("toStartOfDay(toDateTime('2024-01-01', 'UTC'))");
      expect(result).not.toContain("2024-02-01");
    });

    it("should return empty string for an invalid date format", () => {
      expect(getTime({ start_date: "01/01/2024", end_date: "2024-01-31", time_zone: "UTC" })).toBe("");
    });

    // Potential footgun: an invalid time zone silently degrades to all-time
    // (empty statement) rather than throwing; callers validate upstream.
    it("should return empty string for an invalid time zone", () => {
      expect(getTime({ start_date: "2024-01-01", end_date: "2024-01-31", time_zone: "Not/AZone" })).toBe("");
    });
  });

  describe("datetime range", () => {
    it("should build a UTC datetime range", () => {
      const result = getTime({
        start_datetime: "2024-01-01 00:00:00",
        end_datetime: "2024-01-02 12:30:00",
      });

      expect(normalize(result)).toBe(
        "AND timestamp >= toDateTime('2024-01-01 00:00:00', 'UTC') AND timestamp < toDateTime('2024-01-02 12:30:00', 'UTC')"
      );
    });

    it("should normalize offset datetimes to UTC", () => {
      const result = getTime({
        start_datetime: "2024-01-01T05:00:00+02:00",
        end_datetime: "2024-01-02T05:00:00+02:00",
      });

      expect(normalize(result)).toBe(
        "AND timestamp >= toDateTime('2024-01-01 03:00:00', 'UTC') AND timestamp < toDateTime('2024-01-02 03:00:00', 'UTC')"
      );
    });

    it("should return empty string when start_datetime is not before end_datetime", () => {
      expect(getTime({ start_datetime: "2024-01-02 00:00:00", end_datetime: "2024-01-01 00:00:00" })).toBe("");
      expect(getTime({ start_datetime: "2024-01-01 00:00:00", end_datetime: "2024-01-01 00:00:00" })).toBe("");
    });
  });

  describe("past minutes range", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should compute exact UTC timestamps from past minutes", () => {
      const result = getTime({ past_minutes_start: 60, past_minutes_end: 0 });

      expect(result).toBe(
        "AND timestamp > toDateTime('2024-06-15 11:00:00') AND timestamp <= toDateTime('2024-06-15 12:00:00')"
      );
    });

    it("should accept numeric strings for past minutes", () => {
      const result = getTime({
        past_minutes_start: "30" as unknown as number,
        past_minutes_end: "0" as unknown as number,
      });

      expect(result).toBe(
        "AND timestamp > toDateTime('2024-06-15 11:30:00') AND timestamp <= toDateTime('2024-06-15 12:00:00')"
      );
    });

    it("should return empty string when start is not greater than end", () => {
      expect(getTime({ past_minutes_start: 0, past_minutes_end: 60 })).toBe("");
      expect(getTime({ past_minutes_start: 30, past_minutes_end: 30 })).toBe("");
    });

    it("should ignore an unpaired past_minutes param", () => {
      expect(getTime({ past_minutes_start: 60 })).toBe("");
    });
  });

  describe("empty params", () => {
    it("should return empty string when no time params are provided", () => {
      expect(getTime({})).toBe("");
    });

    it("should return empty string when only one date bound is provided", () => {
      expect(getTime({ start_date: "2024-01-01", time_zone: "UTC" })).toBe("");
      expect(getTime({ end_date: "2024-01-31", time_zone: "UTC" })).toBe("");
    });
  });
});

describe("normalizeDatetimeForClickhouse", () => {
  it("should strip the Z suffix from ISO UTC datetimes", () => {
    expect(normalizeDatetimeForClickhouse("2024-01-15T10:30:00Z")).toBe("2024-01-15 10:30:00");
  });

  it("should convert positive offsets to UTC", () => {
    expect(normalizeDatetimeForClickhouse("2024-01-15T10:30:00+02:00")).toBe("2024-01-15 08:30:00");
  });

  it("should convert negative offsets to UTC", () => {
    expect(normalizeDatetimeForClickhouse("2024-01-15T10:30:00-05:00")).toBe("2024-01-15 15:30:00");
  });

  it("should treat zoneless datetimes as UTC", () => {
    expect(normalizeDatetimeForClickhouse("2024-01-15T10:30:00")).toBe("2024-01-15 10:30:00");
  });

  it("should accept space-separated datetimes without a zone", () => {
    expect(normalizeDatetimeForClickhouse("2024-01-15 10:30:00")).toBe("2024-01-15 10:30:00");
  });

  it("should accept space-separated datetimes with an offset", () => {
    expect(normalizeDatetimeForClickhouse("2024-01-15 10:30:00+02:00")).toBe("2024-01-15 08:30:00");
  });

  it("should expand date-only input to midnight UTC", () => {
    expect(normalizeDatetimeForClickhouse("2024-01-15")).toBe("2024-01-15 00:00:00");
  });

  it("should truncate milliseconds", () => {
    expect(normalizeDatetimeForClickhouse("2024-01-15T10:30:00.999Z")).toBe("2024-01-15 10:30:00");
  });

  // Unparseable input reaches toISOString() on an Invalid Date and throws;
  // callers only pass values already validated by the datetime regex.
  it("should throw on unparseable input", () => {
    expect(() => normalizeDatetimeForClickhouse("not-a-date")).toThrow(RangeError);
  });
});

describe("patternToRegex", () => {
  it("should convert a single * to a one-segment matcher", () => {
    expect(patternToRegex("/blog/*")).toBe("^/blog/[^/]+$");
  });

  it("should convert ** to a multi-segment matcher", () => {
    expect(patternToRegex("/blog/**")).toBe("^/blog/.*$");
  });

  it("should handle ** in the middle of a pattern", () => {
    expect(patternToRegex("/docs/**/intro")).toBe("^/docs/.*/intro$");
  });

  it("should handle bare wildcards", () => {
    expect(patternToRegex("*")).toBe("^[^/]+$");
    expect(patternToRegex("**")).toBe("^.*$");
  });

  it("should escape regex metacharacters", () => {
    expect(patternToRegex("/path.html")).toBe("^/path\\.html$");
    expect(patternToRegex("/a+b?c")).toBe("^/a\\+b\\?c$");
    expect(patternToRegex("/(x)|[y]")).toBe("^/\\(x\\)\\|\\[y\\]$");
    expect(patternToRegex("/p{1}^$")).toBe("^/p\\{1\\}\\^\\$$");
    expect(patternToRegex("/back\\slash")).toBe("^/back\\\\slash$");
  });

  it("should not treat a literal {{DOUBLE_STAR}} in the input as the internal marker", () => {
    // Braces are escaped before the marker substitution, so the marker regex
    // cannot match user input containing the literal token.
    expect(patternToRegex("/{{DOUBLE_STAR}}")).toBe("^/\\{\\{DOUBLE_STAR\\}\\}$");
  });

  it("should treat *** as ** followed by *", () => {
    expect(patternToRegex("/a/***")).toBe("^/a/.*[^/]+$");
  });

  it("should anchor patterns without wildcards", () => {
    expect(patternToRegex("/pricing")).toBe("^/pricing$");
  });
});

describe("processResults", () => {
  it("should coerce numeric strings to numbers", async () => {
    const rows = await processResults<Record<string, unknown>>(
      makeResultSet([{ count: "123", ratio: "45.6", negative: "-7" }])
    );

    expect(rows).toEqual([{ count: 123, ratio: 45.6, negative: -7 }]);
  });

  it("should leave existing numbers untouched", async () => {
    const rows = await processResults<Record<string, unknown>>(makeResultSet([{ count: 42 }]));

    expect(rows).toEqual([{ count: 42 }]);
  });

  it("should not coerce ID-like fields even when numeric", async () => {
    const rows = await processResults<Record<string, unknown>>(
      makeResultSet([
        {
          session_id: "12345",
          user_id: "67890",
          identified_user_id: "111",
          effective_user_id: "222",
          site_id: "999",
        },
      ])
    );

    expect(rows).toEqual([
      {
        session_id: "12345",
        user_id: "67890",
        identified_user_id: "111",
        effective_user_id: "222",
        site_id: 999,
      },
    ]);
  });

  it("should leave booleans, empty strings, null, and undefined untouched", async () => {
    const rows = await processResults<Record<string, unknown>>(
      makeResultSet([{ flagOn: true, flagOff: false, empty: "", missing: null, gone: undefined }])
    );

    expect(rows).toEqual([{ flagOn: true, flagOff: false, empty: "", missing: null, gone: undefined }]);
  });

  it("should not coerce non-numeric strings", async () => {
    const rows = await processResults<Record<string, unknown>>(
      makeResultSet([{ browser: "Chrome", date: "2024-01-01", version: "1.2.3", word: "true" }])
    );

    expect(rows).toEqual([{ browser: "Chrome", date: "2024-01-01", version: "1.2.3", word: "true" }]);
  });

  // Number(" ") === 0, and only the exact empty string is excluded, so
  // whitespace-only strings collapse to 0. Pinning current behavior.
  it("should coerce whitespace-only strings to 0", async () => {
    const rows = await processResults<Record<string, unknown>>(makeResultSet([{ blank: " " }]));

    expect(rows).toEqual([{ blank: 0 }]);
  });

  it("should process every row independently", async () => {
    const rows = await processResults<Record<string, unknown>>(
      makeResultSet([
        { pathname: "/a", visitors: "10" },
        { pathname: "/b", visitors: "20" },
      ])
    );

    expect(rows).toEqual([
      { pathname: "/a", visitors: 10 },
      { pathname: "/b", visitors: 20 },
    ]);
  });
});
