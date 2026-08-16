import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TimeBucket } from "../types.js";
import {
  bucketIntervalMap,
  getTimeStatement,
  normalizeDatetimeForClickhouse,
  resolveTimeWindow,
  TimeBucketToFn,
  TimeWindowParams,
} from "./timeWindow.js";

const normalize = (sql: string) => sql.replace(/\s+/g, " ").trim();

const getTime = (params: Partial<TimeWindowParams>, column?: string) =>
  getTimeStatement(params as TimeWindowParams, column);
const fillOf = (params: Partial<TimeWindowParams>, bucket: TimeBucket) =>
  normalize(resolveTimeWindow(params as TimeWindowParams).fill(bucket));
const bucketedOf = (params: Partial<TimeWindowParams>, column: string, bucket: TimeBucket) =>
  normalize(resolveTimeWindow(params as TimeWindowParams).bucketed(column, bucket));

const ALL_BUCKETS = Object.keys(TimeBucketToFn) as TimeBucket[];

const DATE_RANGE = { start_date: "2024-01-01", end_date: "2024-01-31", time_zone: "America/New_York" };
const DATETIME_RANGE = { start_datetime: "2024-01-01 05:30:00", end_datetime: "2024-01-02 06:45:00" };
const PAST_MINUTES = { past_minutes_start: 120, past_minutes_end: 0 };

describe("where()", () => {
  describe("date range", () => {
    it("should build a timezone-aware day range from start_date and end_date", () => {
      expect(normalize(getTime(DATE_RANGE))).toBe(
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
      const result = getTime({ start_date: "2024-06-15", end_date: "2024-06-15", time_zone: "UTC" });

      expect(normalize(result)).toContain("toDate('2024-06-15') = toDate(now(), 'UTC')");
      expect(normalize(result)).toContain("toTimeZone(now(), 'UTC')");
    });

    it("should take precedence over datetime range and past minutes", () => {
      const result = getTime({
        start_date: "2024-01-01",
        end_date: "2024-01-31",
        time_zone: "UTC",
        ...DATETIME_RANGE,
        ...PAST_MINUTES,
      });

      expect(result).toContain("toStartOfDay(toDateTime('2024-01-01', 'UTC'))");
      expect(result).not.toContain("2024-01-02");
    });

    it("should fall through to the datetime range when the dates are malformed", () => {
      const result = getTime({ start_date: "01/01/2024", end_date: "2024-01-31", ...DATETIME_RANGE });

      expect(normalize(result)).toBe(
        "AND timestamp >= toDateTime('2024-01-01 05:30:00', 'UTC') AND timestamp < toDateTime('2024-01-02 06:45:00', 'UTC')"
      );
    });

    it("should return empty string for an invalid date format", () => {
      expect(getTime({ start_date: "01/01/2024", end_date: "2024-01-31", time_zone: "UTC" })).toBe("");
    });
  });

  describe("datetime range", () => {
    it("should build a UTC datetime range", () => {
      const result = getTime({ start_datetime: "2024-01-01 00:00:00", end_datetime: "2024-01-02 12:30:00" });

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
      expect(getTime({ past_minutes_start: 60, past_minutes_end: 0 })).toBe(
        "AND timestamp > toDateTime('2024-06-15 11:00:00', 'UTC') AND timestamp <= toDateTime('2024-06-15 12:00:00', 'UTC')"
      );
    });

    it("should accept numeric strings for past minutes", () => {
      const result = getTime({
        past_minutes_start: "30" as unknown as number,
        past_minutes_end: "0" as unknown as number,
      });

      expect(result).toBe(
        "AND timestamp > toDateTime('2024-06-15 11:30:00', 'UTC') AND timestamp <= toDateTime('2024-06-15 12:00:00', 'UTC')"
      );
    });

    it("should return empty string when start is not greater than end", () => {
      expect(getTime({ past_minutes_start: 0, past_minutes_end: 60 })).toBe("");
      expect(getTime({ past_minutes_start: 30, past_minutes_end: 30 })).toBe("");
    });

    it("should ignore an unpaired past_minutes param", () => {
      expect(getTime({ past_minutes_start: 60 })).toBe("");
    });

    // past_minutes_end = 0 is the realtime dashboard's "up to now". A truthiness
    // test on the bound treats it as absent, which is how the performance
    // endpoint used to decide it was an all-time query and drop its fill.
    it("should treat a zero end bound as a real bound", () => {
      expect(resolveTimeWindow(PAST_MINUTES as TimeWindowParams).isAllTime).toBe(false);
      expect(getTime(PAST_MINUTES)).not.toBe("");
    });
  });

  describe("column", () => {
    it("should bound whichever column the caller names", () => {
      // The replay tables key on start_time and the hourly rollups on
      // event_hour; callers used to regex-rewrite a statement built for
      // `timestamp`.
      expect(getTime(DATE_RANGE, "start_time")).toContain("AND start_time >=");
      expect(getTime(DATE_RANGE, "start_time")).not.toContain("timestamp");
      expect(getTime(PAST_MINUTES, "event_hour")).toContain("AND event_hour >");
      expect(getTime(DATETIME_RANGE, "session_hour")).toContain("AND session_hour >=");
    });

    it("should default to timestamp", () => {
      expect(getTime(DATE_RANGE)).toContain("AND timestamp >=");
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

    // An unusable timezone makes every mode meaningless, so the window degrades
    // to all-time rather than silently reporting UTC days as local ones.
    // validateHttpTimeParams rejects it before any HTTP request gets here.
    it("should return empty string for an invalid time zone", () => {
      expect(getTime({ ...DATE_RANGE, time_zone: "Not/AZone" })).toBe("");
      expect(getTime({ ...DATETIME_RANGE, time_zone: "Not/AZone" })).toBe("");
      expect(getTime({ ...PAST_MINUTES, time_zone: "Not/AZone" })).toBe("");
    });
  });
});

describe("fill()", () => {
  describe("date range", () => {
    it("should build a timezone-aware WITH FILL clause bucketed at the range start", () => {
      expect(fillOf(DATE_RANGE, "day")).toBe(
        "WITH FILL FROM toTimeZone(toDateTime(toStartOfDay(toTimeZone(toDateTime('2024-01-01', 'America/New_York'), " +
          "'America/New_York'))), 'UTC') " +
          "TO if( toDate('2024-01-31') = toDate(now(), 'America/New_York'), toTimeZone(now(), 'UTC'), " +
          "toTimeZone(toDateTime(toStartOfDay(toTimeZone(toDateTime('2024-01-31', 'America/New_York'), " +
          "'America/New_York'))) + INTERVAL 1 DAY, 'UTC') ) " +
          "STEP INTERVAL 1 DAY"
      );
    });

    it("should default a missing time_zone to UTC", () => {
      expect(fillOf({ start_date: "2024-01-01", end_date: "2024-01-31" }, "day")).toContain(
        "toDateTime('2024-01-01', 'UTC')"
      );
    });
  });

  describe("datetime range", () => {
    it("should bucket-align both bounds in the window's timezone", () => {
      const alignedEnd = "toDateTime(toStartOfHour(toTimeZone(toDateTime('2024-01-02 06:45:00', 'UTC'), 'UTC')))";

      expect(fillOf({ ...DATETIME_RANGE, time_zone: "UTC" }, "hour")).toBe(
        "WITH FILL FROM toDateTime(toStartOfHour(toTimeZone(toDateTime('2024-01-01 05:30:00', 'UTC'), 'UTC'))) " +
          `TO if(${alignedEnd} = toDateTime('2024-01-02 06:45:00', 'UTC'), ` +
          `${alignedEnd}, ${alignedEnd} + INTERVAL 1 HOUR) ` +
          "STEP INTERVAL 1 HOUR"
      );
    });

    // Regression: the accepted datetime format allows a Z or +02:00 suffix and
    // ClickHouse's toDateTime rejects both. The error and performance fills
    // interpolated the raw value, so a datetime-range request 500'd.
    it("should normalize a zoned datetime before interpolating it", () => {
      const result = fillOf(
        { start_datetime: "2024-01-01T05:30:00Z", end_datetime: "2024-01-02T06:45:00+02:00" },
        "hour"
      );

      expect(result).toContain("'2024-01-01 05:30:00'");
      expect(result).toContain("'2024-01-02 04:45:00'");
      expect(result).not.toContain("Z'");
      expect(result).not.toContain("+02:00");
    });

    // TO is exclusive. Where the upper bound falls decides whether stopping at
    // it is right: on a boundary it names a bucket the window excludes, so the
    // fill must stop short of it; mid-bucket it names a bucket the window
    // partly covers, so the fill must reach one step past it or an empty final
    // bucket is dropped and the chart ends early. The clause resolves that in
    // SQL rather than assuming one case, which is what it used to do.
    // Regression (found in review): the fill used to stop at the truncated end
    // unconditionally for a datetime range. For [10:30, 14:45) at hour buckets
    // the rows from 14:00–14:45 are inside the window and bucket to 14:00, but
    // TO 14:00 is exclusive — so the 14:00 bucket appeared only when it had
    // real rows, and an empty one silently ended the chart an hour early.
    it("should reach the bucket a mid-bucket upper bound falls in", () => {
      const result = fillOf({ start_datetime: "2024-01-01 10:30:00", end_datetime: "2024-01-01 14:45:00" }, "hour");

      expect(result).toContain("+ INTERVAL 1 HOUR)");
      expect(result).toContain("'2024-01-01 14:45:00'");
    });

    it("should not fill past an upper bound already on a bucket boundary", () => {
      expect(
        fillOf({ start_datetime: "2024-01-01 00:00:00", end_datetime: "2024-01-01 04:00:00" }, "hour")
      ).toContain("TO if(");
    });
  });

  describe("past minutes range", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-06-15T12:34:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    // Regression: the error fill ran `FROM now() - INTERVAL n MINUTE`, which is
    // not on a bucket boundary, so filled rows landed at :34 between real rows
    // at :00 instead of on top of them.
    it("should align the lower bound to a bucket boundary", () => {
      const alignedEnd = "toDateTime(toStartOfHour(toTimeZone(toDateTime('2024-06-15 12:34:00', 'UTC'), 'UTC')))";

      expect(fillOf(PAST_MINUTES, "hour")).toBe(
        "WITH FILL FROM toDateTime(toStartOfHour(toTimeZone(toDateTime('2024-06-15 10:34:00', 'UTC'), 'UTC'))) " +
          `TO if(${alignedEnd} = toDateTime('2024-06-15 12:34:00', 'UTC'), ` +
          `${alignedEnd}, ${alignedEnd} + INTERVAL 1 HOUR) ` +
          "STEP INTERVAL 1 HOUR"
      );
    });

    // Regression: the fill bucketed in the server timezone while the SELECT it
    // is attached to buckets in the Site's, so on a half-hour offset every
    // filled row landed 30 minutes off the real ones.
    it("should align in the window's timezone, not the server's", () => {
      expect(fillOf({ ...PAST_MINUTES, time_zone: "Asia/Kolkata" }, "hour")).toContain(
        "toDateTime(toStartOfHour(toTimeZone(toDateTime('2024-06-15 10:34:00', 'UTC'), 'Asia/Kolkata')))"
      );
    });

    // The window ends mid-bucket, so the final bucket does hold rows: one step
    // past the aligned end is what makes it appear when it is empty.
    it("should extend one step past the aligned upper bound", () => {
      expect(fillOf(PAST_MINUTES, "five_minutes")).toContain("+ INTERVAL 5 MINUTES) STEP INTERVAL 5 MINUTES");
    });

    it("should read now() once for the predicate and the fill", () => {
      const window = resolveTimeWindow(PAST_MINUTES as TimeWindowParams);

      vi.setSystemTime(new Date("2024-06-15T18:00:00Z"));

      expect(window.where()).toContain("2024-06-15 12:34:00");
      expect(window.fill("hour")).toContain("2024-06-15 12:34:00");
    });
  });

  describe("buckets", () => {
    it.each(ALL_BUCKETS)("should use the matching fn and interval for %s", bucket => {
      const result = fillOf(DATE_RANGE, bucket);

      expect(result).toContain(TimeBucketToFn[bucket]);
      expect(result).toContain(`STEP INTERVAL ${bucketIntervalMap[bucket]}`);
    });
  });

  describe("all-time", () => {
    // Regression: the fill builders threw when handed no time params and the
    // error handler called its builder unconditionally, so an all-time error
    // time-series answered 500.
    it("should return empty string rather than throwing when no window is bounded", () => {
      expect(fillOf({}, "day")).toBe("");
      expect(fillOf({ start_date: "2024-01-01" }, "day")).toBe("");
      expect(fillOf({ past_minutes_start: 0, past_minutes_end: 60 }, "hour")).toBe("");
    });
  });
});

describe("bucketed()", () => {
  it("should truncate the named column in the window's timezone", () => {
    expect(bucketedOf(DATE_RANGE, "timestamp", "hour")).toBe(
      "toDateTime(toStartOfHour(toTimeZone(timestamp, 'America/New_York')))"
    );
  });

  it("should bucket any column the rollups name their time by", () => {
    for (const column of ["timestamp", "start_time", "event_hour", "session_hour", "session_start"]) {
      expect(bucketedOf(DATE_RANGE, column, "day")).toContain(`toTimeZone(${column}, 'America/New_York')`);
    }
  });

  // ClickHouse rejects a WITH FILL whose bounds are not the same type as the
  // column being filled, and toStartOfWeek/Month/Year return Date where the
  // other bucket functions return DateTime. Every bucketed query but the error
  // time-series already wrapped the truncation in toDateTime to flatten that,
  // which is why one shared fill builder could not serve both — the fill and
  // the column now come from the same expression.
  it("should render every bucket size as a DateTime", () => {
    for (const bucket of ALL_BUCKETS) {
      expect(bucketedOf(DATE_RANGE, "timestamp", bucket)).toMatch(/^toDateTime\(/);
      expect(fillOf(DATE_RANGE, bucket)).toContain(`toDateTime(${TimeBucketToFn[bucket]}(`);
    }
  });

  it("should still bucket when the window is all-time", () => {
    const window = resolveTimeWindow({ time_zone: "Asia/Kolkata" } as TimeWindowParams);

    expect(window.isAllTime).toBe(true);
    expect(window.bucketed("timestamp", "day")).toContain("'Asia/Kolkata'");
  });

  it("should fall back to UTC for an unusable timezone", () => {
    expect(bucketedOf({ time_zone: "Not/AZone" }, "timestamp", "day")).toContain("toTimeZone(timestamp, 'UTC')");
  });
});

describe("isAllTime", () => {
  it("should agree with where() on every shape of params", () => {
    const cases: Partial<TimeWindowParams>[] = [
      {},
      DATE_RANGE,
      DATETIME_RANGE,
      PAST_MINUTES,
      { start_date: "2024-01-01" },
      { end_date: "2024-01-31" },
      { start_datetime: "2024-01-01 00:00:00" },
      { past_minutes_start: 60 },
      { past_minutes_start: 0, past_minutes_end: 60 },
      { start_date: "01/01/2024", end_date: "2024-01-31" },
      { ...DATE_RANGE, time_zone: "Not/AZone" },
    ];

    // The predicate and the fill used to be gated by separately written
    // presence checks, so a fill could be emitted for a window the WHERE clause
    // had silently dropped.
    for (const params of cases) {
      const window = resolveTimeWindow(params as TimeWindowParams);
      expect(window.isAllTime).toBe(window.where() === "");
      expect(window.isAllTime).toBe(window.fill("hour") === "");
    }
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

describe("SQL injection", () => {
  it("should reject values that do not match the accepted formats", () => {
    expect(getTime({ start_date: "2024-01-01'; DROP TABLE events;--", end_date: "2024-01-31" })).toBe("");
    expect(getTime({ start_datetime: "2024-01-01 00:00:00' OR '1'='1", end_datetime: "2024-01-02 00:00:00" })).toBe("");
    expect(getTime({ past_minutes_start: "60; DROP TABLE events" as unknown as number, past_minutes_end: 0 })).toBe("");
  });

  it("should escape the timezone rather than interpolating it raw", () => {
    // An invalid zone degrades to all-time, so the escaping below is a second
    // line of defence rather than the only one.
    expect(getTime({ ...DATE_RANGE, time_zone: "UTC'; DROP TABLE events;--" })).toBe("");
    expect(fillOf({ ...DATE_RANGE, time_zone: "UTC'; DROP TABLE events;--" }, "day")).toBe("");
  });
});
