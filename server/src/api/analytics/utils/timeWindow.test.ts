import { TimeBucket } from "@rybbit/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  normalizeDatetimeForClickhouse,
  parseTimeWindow,
  TimeWindowParams,
  getTimeStatement,
  timeWindowFill,
  timeWindowWhere,
} from "./timeWindow.js";

const normalize = (sql: string) => sql.replace(/\s+/g, " ").trim();

const params = (p: Partial<TimeWindowParams>) => p as TimeWindowParams;
const where = (p: Partial<TimeWindowParams>, column?: string) => timeWindowWhere(parseTimeWindow(params(p)), column);
const fill = (p: Partial<TimeWindowParams>, bucket: TimeBucket) => timeWindowFill(parseTimeWindow(params(p)), bucket);

describe("parseTimeWindow", () => {
  it("should resolve a date range", () => {
    expect(
      parseTimeWindow(params({ start_date: "2024-01-01", end_date: "2024-01-31", time_zone: "Asia/Tokyo" }))
    ).toEqual({ kind: "date", startDate: "2024-01-01", endDate: "2024-01-31", timeZone: "Asia/Tokyo" });
  });

  it("should default a missing time_zone to UTC rather than dropping the range", () => {
    expect(parseTimeWindow(params({ start_date: "2024-01-01", end_date: "2024-01-31" }))).toEqual({
      kind: "date",
      startDate: "2024-01-01",
      endDate: "2024-01-31",
      timeZone: "UTC",
    });
  });

  it("should resolve a datetime range to normalized UTC bounds", () => {
    expect(
      parseTimeWindow(
        params({ start_datetime: "2024-01-01T05:00:00+02:00", end_datetime: "2024-01-02T05:00:00+02:00" })
      )
    ).toEqual({
      kind: "datetime",
      startDatetime: "2024-01-01 03:00:00",
      endDatetime: "2024-01-02 03:00:00",
      timeZone: "UTC",
    });
  });

  it("should resolve past minutes to absolute timestamps", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));

    expect(parseTimeWindow(params({ past_minutes_start: 120, past_minutes_end: 60 }))).toEqual({
      kind: "past_minutes",
      startIso: "2024-06-15 10:00:00",
      endIso: "2024-06-15 11:00:00",
      timeZone: "UTC",
    });

    vi.useRealTimers();
  });

  it("should prefer a date range over a datetime range and past minutes", () => {
    const window = parseTimeWindow(
      params({
        start_date: "2024-01-01",
        end_date: "2024-01-31",
        time_zone: "UTC",
        start_datetime: "2024-02-01 00:00:00",
        end_datetime: "2024-02-02 00:00:00",
        past_minutes_start: 60,
        past_minutes_end: 0,
      })
    );

    expect(window.kind).toBe("date");
  });

  describe("degrades to all-time", () => {
    it("with no time params at all", () => {
      expect(parseTimeWindow(params({}))).toEqual({ kind: "all_time" });
    });

    it("with only one bound of a range", () => {
      expect(parseTimeWindow(params({ start_date: "2024-01-01", time_zone: "UTC" })).kind).toBe("all_time");
      expect(parseTimeWindow(params({ end_date: "2024-01-31", time_zone: "UTC" })).kind).toBe("all_time");
      expect(parseTimeWindow(params({ past_minutes_start: 60 })).kind).toBe("all_time");
    });

    // A malformed value degrades to all-time rather than throwing;
    // validateHttpTimeParams rejects it at the route so it never gets this far
    // over HTTP.
    it("with a malformed date, datetime, time zone, or inverted range", () => {
      expect(parseTimeWindow(params({ start_date: "01/01/2024", end_date: "2024-01-31", time_zone: "UTC" })).kind).toBe(
        "all_time"
      );
      expect(
        parseTimeWindow(params({ start_date: "2024-01-01", end_date: "2024-01-31", time_zone: "Not/AZone" })).kind
      ).toBe("all_time");
      expect(
        parseTimeWindow(params({ start_datetime: "2024-01-02 00:00:00", end_datetime: "2024-01-01 00:00:00" })).kind
      ).toBe("all_time");
      expect(parseTimeWindow(params({ past_minutes_start: 0, past_minutes_end: 60 })).kind).toBe("all_time");
    });
  });

  it("should accept numeric strings for past minutes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));

    expect(
      parseTimeWindow(
        params({ past_minutes_start: "30" as unknown as number, past_minutes_end: "0" as unknown as number })
      )
    ).toEqual({
      kind: "past_minutes",
      startIso: "2024-06-15 11:30:00",
      endIso: "2024-06-15 12:00:00",
      timeZone: "UTC",
    });

    vi.useRealTimers();
  });
});

describe("timeWindowWhere", () => {
  describe("date range", () => {
    it("should build a timezone-aware day range", () => {
      expect(
        normalize(where({ start_date: "2024-01-01", end_date: "2024-01-31", time_zone: "America/New_York" }))
      ).toBe(
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

    // The "is the end bound today?" decision is deferred to ClickHouse so an
    // open-ended range tracks now() instead of the request's clock.
    it("should defer the 'today' decision to ClickHouse", () => {
      const result = where({ start_date: "2024-06-15", end_date: "2024-06-15", time_zone: "UTC" });

      expect(normalize(result)).toContain("toDate('2024-06-15') = toDate(now(), 'UTC')");
      expect(normalize(result)).toContain("toTimeZone(now(), 'UTC')");
    });
  });

  describe("datetime range", () => {
    it("should build a UTC datetime range", () => {
      expect(normalize(where({ start_datetime: "2024-01-01 00:00:00", end_datetime: "2024-01-02 12:30:00" }))).toBe(
        "AND timestamp >= toDateTime('2024-01-01 00:00:00', 'UTC') AND timestamp < toDateTime('2024-01-02 12:30:00', 'UTC')"
      );
    });

    it("should normalize offset datetimes to UTC", () => {
      expect(
        normalize(where({ start_datetime: "2024-01-01T05:00:00+02:00", end_datetime: "2024-01-02T05:00:00+02:00" }))
      ).toBe(
        "AND timestamp >= toDateTime('2024-01-01 03:00:00', 'UTC') AND timestamp < toDateTime('2024-01-02 03:00:00', 'UTC')"
      );
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

    it("should compute exact UTC timestamps", () => {
      expect(where({ past_minutes_start: 60, past_minutes_end: 0 })).toBe(
        "AND timestamp > toDateTime('2024-06-15 11:00:00', 'UTC') AND timestamp <= toDateTime('2024-06-15 12:00:00', 'UTC')"
      );
    });

    // The bounds are absolute instants, so a time zone changes where the
    // buckets fall but never which rows the predicate matches.
    it("should not vary with the time zone", () => {
      expect(where({ past_minutes_start: 60, past_minutes_end: 0, time_zone: "America/New_York" })).toBe(
        where({ past_minutes_start: 60, past_minutes_end: 0, time_zone: "UTC" })
      );
    });
  });

  it("should contribute nothing for an all-time window", () => {
    expect(where({})).toBe("");
  });

  // The column is a parameter so callers reading a materialized view or the
  // replay metadata table bound their own column instead of rewriting the
  // generated SQL with a regex.
  describe("column parameter", () => {
    it("should bound the named column in every mode", () => {
      expect(where({ start_date: "2024-01-01", end_date: "2024-01-31", time_zone: "UTC" }, "event_hour")).toContain(
        "AND event_hour >="
      );
      expect(
        where({ start_datetime: "2024-01-01 00:00:00", end_datetime: "2024-01-02 00:00:00" }, "start_time")
      ).toContain("AND start_time >=");
      expect(where({ past_minutes_start: 60, past_minutes_end: 0 }, "session_hour")).toContain("AND session_hour >");
    });

    it("should default to the events timestamp column", () => {
      expect(where({ past_minutes_start: 60, past_minutes_end: 0 })).toContain("AND timestamp >");
    });
  });
});

describe("timeWindowFill", () => {
  describe("date range", () => {
    it("should build a timezone-aware fill clause", () => {
      expect(
        normalize(fill({ start_date: "2024-01-01", end_date: "2024-01-31", time_zone: "America/New_York" }, "day"))
      ).toBe(
        "WITH FILL FROM toTimeZone( toDateTime(toStartOfDay(toDateTime('2024-01-01', 'America/New_York'))), 'UTC' ) " +
          "TO if( toDate('2024-01-31') = toDate(now(), 'America/New_York'), toTimeZone(now(), 'UTC'), " +
          "toTimeZone( toDateTime(toStartOfDay(toDateTime('2024-01-31', 'America/New_York'))) + INTERVAL 1 DAY, 'UTC' ) ) " +
          "STEP INTERVAL 1 DAY"
      );
    });

    it("should default a missing time_zone to UTC", () => {
      const result = fill({ start_date: "2024-01-01", end_date: "2024-01-31" }, "hour");
      expect(result).toContain("toDateTime('2024-01-01', 'UTC')");
      expect(result).toContain("toStartOfHour");
      expect(result).toContain("STEP INTERVAL 1 HOUR");
    });
  });

  describe("datetime range", () => {
    it("should build a fill clause from normalized bounds", () => {
      expect(
        normalize(fill({ start_datetime: "2024-01-01 05:30:00", end_datetime: "2024-01-02 06:45:00" }, "hour"))
      ).toBe(
        "WITH FILL FROM toTimeZone( toDateTime(toStartOfHour(toTimeZone(toDateTime('2024-01-01 05:30:00', 'UTC'), 'UTC'))), 'UTC' ) " +
          "TO toTimeZone( toDateTime(toStartOfHour(toTimeZone(toDateTime('2024-01-02 06:45:00', 'UTC'), 'UTC'))), 'UTC' ) " +
          "STEP INTERVAL 1 HOUR"
      );
    });

    // The bounds carry a Z or an offset when the dashboard sends them;
    // toDateTime() cannot parse those, so they are normalized first.
    it("should normalize zoned bounds before they reach ClickHouse", () => {
      const result = fill({ start_datetime: "2024-01-01T05:00:00Z", end_datetime: "2024-01-02T05:00:00Z" }, "hour");

      expect(result).toContain("toDateTime('2024-01-01 05:00:00', 'UTC')");
      expect(result).not.toContain("Z'");
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

    it("should truncate the bounds to the bucket", () => {
      expect(normalize(fill({ past_minutes_start: 120, past_minutes_end: 60 }, "hour"))).toBe(
        "WITH FILL FROM toTimeZone( toDateTime(toStartOfHour(toTimeZone(toDateTime('2024-06-15 10:00:00', 'UTC'), 'UTC'))), 'UTC' ) " +
          "TO toTimeZone( toDateTime(toStartOfHour(toTimeZone(toDateTime('2024-06-15 11:00:00', 'UTC'), 'UTC'))), 'UTC' ) + INTERVAL 1 HOUR " +
          "STEP INTERVAL 1 HOUR"
      );
    });

    // The SELECT cuts its buckets with fn(toTimeZone(timestamp, tz)); bounds cut
    // in UTC would land between them and WITH FILL would emit a second, offset
    // row for every real one.
    it("should truncate in the window's time zone", () => {
      expect(fill({ past_minutes_start: 120, past_minutes_end: 0, time_zone: "America/New_York" }, "day")).toContain(
        "toStartOfDay(toTimeZone(toDateTime('2024-06-15 10:00:00', 'UTC'), 'America/New_York'))"
      );
    });

    // toStartOfWeek/Month/Year return Date; ClickHouse rejects a Date bound on
    // a DateTime order key with INVALID_WITH_FILL_EXPRESSION, so the bounds are
    // lifted back to DateTime.
    it("should lift Date-returning bucket functions back to DateTime", () => {
      for (const bucket of ["week", "month", "year"] as TimeBucket[]) {
        expect(normalize(fill({ past_minutes_start: 120, past_minutes_end: 0 }, bucket))).toContain(
          `FROM toTimeZone( toDateTime(toStartOf${bucket[0].toUpperCase()}${bucket.slice(1)}(`
        );
      }
    });

    // WITH FILL's TO bound is exclusive: the nudge past the truncated end makes
    // the last bucket inclusive, and staying within the bucket's own grain
    // keeps it from emitting a further empty bucket beyond the window.
    it("should nudge the exclusive TO bound by one unit of the bucket's grain", () => {
      expect(fill({ past_minutes_start: 30, past_minutes_end: 0 }, "five_minutes")).toContain("+ INTERVAL 1 MINUTE");
      expect(fill({ past_minutes_start: 30, past_minutes_end: 0 }, "five_minutes")).toContain(
        "STEP INTERVAL 5 MINUTES"
      );
      expect(fill({ past_minutes_start: 30, past_minutes_end: 0 }, "week")).toContain("+ INTERVAL 1 WEEK");
      expect(fill({ past_minutes_start: 30, past_minutes_end: 0 }, "year")).toContain("+ INTERVAL 1 YEAR");
    });
  });

  // Regression: the error time-series called its fill builder unconditionally
  // and the builder threw on an unbounded request, so an all-time error chart
  // answered 500. An all-time window has no bounds to fill between.
  it("should contribute nothing for an all-time window", () => {
    expect(fill({}, "day")).toBe("");
    expect(fill({ start_date: "2024-01-01" }, "day")).toBe("");
  });

  // A bucket names a ClickHouse truncation function, so it never reaches SQL
  // unchecked.
  it("should reject an unknown bucket", () => {
    expect(() =>
      fill({ start_date: "2024-01-01", end_date: "2024-01-31", time_zone: "UTC" }, "decade" as TimeBucket)
    ).toThrow();
    expect(() =>
      fill({ start_date: "2024-01-01", end_date: "2024-01-31", time_zone: "UTC" }, undefined as unknown as TimeBucket)
    ).toThrow();
  });
});

describe("one window, one instant", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // The predicate and the fill of a single query used to call new Date()
  // independently, so a query built across a clock tick bounded its scan and
  // its series at different instants.
  it("should give the predicate and the fill the same past-minutes bounds", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00.000Z"));

    const window = parseTimeWindow(params({ past_minutes_start: 60, past_minutes_end: 0 }));
    const predicate = timeWindowWhere(window);

    vi.setSystemTime(new Date("2024-06-15T12:00:59.000Z"));
    const fillClause = timeWindowFill(window, "hour");

    expect(predicate).toContain("2024-06-15 11:00:00");
    expect(fillClause).toContain("2024-06-15 11:00:00");
  });
});

describe("getTimeStatement", () => {
  it("should parse and render the predicate in one step", () => {
    expect(getTimeStatement({ start_date: "2024-01-01", end_date: "2024-01-31", time_zone: "UTC" })).toBe(
      timeWindowWhere(parseTimeWindow(params({ start_date: "2024-01-01", end_date: "2024-01-31", time_zone: "UTC" })))
    );
  });

  it("should accept a column", () => {
    expect(getTimeStatement({ past_minutes_start: 60, past_minutes_end: 0 }, "start_time")).toContain(
      "AND start_time >"
    );
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
