import { DateTime, Settings } from "luxon";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// dateTimeUtils reads navigator.language and the store's timezone at module
// scope, so both are pinned before it is loaded. Everything else here either
// carries an explicit zone or round-trips through the machine's own zone, so
// no TZ pinning is needed.
const getTimezone = vi.hoisted(() => vi.fn<() => string>(() => "UTC"));
vi.mock("./store", () => ({ getTimezone }));

vi.stubGlobal("navigator", { language: "en-US" });

const {
  formatChartDateTime,
  formatDuration,
  formatLocalTime,
  formatShortDuration,
  getTimezoneLabel,
  hour12,
  hourLabels,
  hourMinuteLabels,
  longDayNames,
  parseUtcTimestamp,
  shortDayNames,
  timeZone,
  timezones,
  userLocale,
} = await import("./dateTimeUtils");

beforeEach(() => {
  getTimezone.mockReturnValue("UTC");
  Settings.defaultLocale = "en-US";
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("locale detection", () => {
  it("takes the locale from navigator and resolves a 12-hour preference for en-US", () => {
    expect(userLocale).toBe("en-US");
    expect(hour12).toBe(true);
  });

  it("resolves the runtime timezone to a zone Luxon can use", () => {
    expect(timeZone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
    expect(DateTime.now().setZone(timeZone).isValid).toBe(true);
  });
});

describe("formatDuration", () => {
  it("shows seconds alone below a minute", () => {
    expect(formatDuration(0)).toBe("0 sec");
    expect(formatDuration(45)).toBe("45 sec");
    expect(formatDuration(59)).toBe("59 sec");
  });

  it("shows minutes and seconds from a minute up", () => {
    expect(formatDuration(60)).toBe("1 min, 0 sec");
    expect(formatDuration(90)).toBe("1 min, 30 sec");
    expect(formatDuration(605)).toBe("10 min, 5 sec");
  });

  it("rounds fractional seconds and carries the rounding into minutes", () => {
    expect(formatDuration(44.4)).toBe("44 sec");
    expect(formatDuration(59.6)).toBe("1 min, 0 sec");
  });

  it("never rolls up past minutes", () => {
    expect(formatDuration(3600)).toBe("60 min, 0 sec");
    expect(formatDuration(7325)).toBe("122 min, 5 sec");
  });
});

describe("formatShortDuration", () => {
  it("shows seconds alone below a minute", () => {
    expect(formatShortDuration(0)).toBe("0s");
    expect(formatShortDuration(45)).toBe("45s");
    expect(formatShortDuration(59)).toBe("59s");
  });

  it("drops a zero seconds part", () => {
    expect(formatShortDuration(60)).toBe("1m");
    expect(formatShortDuration(120)).toBe("2m");
  });

  it("shows both parts when there is a remainder", () => {
    expect(formatShortDuration(90)).toBe("1m 30s");
    expect(formatShortDuration(3661)).toBe("61m 1s");
  });

  it("rounds the seconds part", () => {
    expect(formatShortDuration(59.4)).toBe("59s");
    // Quirk: the parts are computed independently, so a seconds value that
    // rounds up to 60 is rendered as-is instead of carrying into the minutes.
    expect(formatShortDuration(119.6)).toBe("1m 60s");
  });
});

describe("formatLocalTime", () => {
  it("pads the minutes to two digits", () => {
    expect(formatLocalTime(9, 5)).toMatch(/9.05/);
  });

  it("distinguishes morning from afternoon under a 12-hour preference", () => {
    expect(formatLocalTime(21, 5)).toMatch(/9.05/);
    expect(formatLocalTime(9, 5)).not.toBe(formatLocalTime(21, 5));
  });
});

describe("formatChartDateTime", () => {
  const dt = DateTime.fromISO("2024-03-15T12:30:00Z", { zone: "utc" });

  it("shows a weekday and date, with no time, for the day bucket", () => {
    expect(formatChartDateTime(dt, "day", "en-US")).toBe("Fri, Mar 15");
  });

  it("shows the hour for coarser-than-day buckets", () => {
    expect(formatChartDateTime(dt, "hour", "en-US")).toBe("Mar 15, 12 PM");
    expect(formatChartDateTime(dt, "week", "en-US")).toBe("Mar 15, 12 PM");
    expect(formatChartDateTime(dt, "month", "en-US")).toBe("Mar 15, 12 PM");
  });

  it.each(["minute", "five_minutes", "ten_minutes", "fifteen_minutes"] as const)(
    "shows minutes for the %s bucket",
    bucket => {
      expect(formatChartDateTime(dt, bucket, "en-US")).toBe("Mar 15, 12:30 PM");
    }
  );

  it("renders in the timezone the store reports, not the datetime's own zone", () => {
    getTimezone.mockReturnValue("America/New_York");

    expect(formatChartDateTime(dt, "hour", "en-US")).toBe("Mar 15, 8 AM");
    expect(formatChartDateTime(dt, "day", "en-US")).toBe("Fri, Mar 15");
  });

  it("crosses the date line when the timezone pushes it there", () => {
    getTimezone.mockReturnValue("Asia/Tokyo");

    expect(formatChartDateTime(dt, "day", "en-US")).toBe("Fri, Mar 15");
    expect(formatChartDateTime(DateTime.fromISO("2024-03-15T20:00:00Z", { zone: "utc" }), "day", "en-US")).toBe(
      "Sat, Mar 16"
    );
  });

  it("honours the locale it is handed", () => {
    expect(formatChartDateTime(dt, "day", "de-DE")).toBe("Fr., 15. März");
  });
});

describe("parseUtcTimestamp", () => {
  it("reads a SQL timestamp as UTC and moves it into the selected timezone", () => {
    getTimezone.mockReturnValue("America/New_York");

    const parsed = parseUtcTimestamp("2024-03-15 12:00:00");

    expect(parsed.isValid).toBe(true);
    expect(parsed.zoneName).toBe("America/New_York");
    expect(parsed.toISO()).toBe("2024-03-15T08:00:00.000-04:00");
  });

  it("accepts a Date and treats its wall-clock fields as UTC", () => {
    getTimezone.mockReturnValue("Asia/Tokyo");

    const parsed = parseUtcTimestamp(new Date(Date.UTC(2024, 2, 15, 12, 0, 0)));

    expect(parsed.toISO()).toBe("2024-03-15T21:00:00.000+09:00");
  });

  it("keeps the timestamp unchanged when the selected timezone is UTC", () => {
    expect(parseUtcTimestamp("2024-03-15 12:00:00").toISO()).toBe("2024-03-15T12:00:00.000Z");
  });

  it("returns an invalid DateTime for an unparseable timestamp rather than throwing", () => {
    expect(parseUtcTimestamp("not a timestamp").isValid).toBe(false);
  });
});

describe("timezone list", () => {
  it("leads with the system sentinel and labels it System", () => {
    expect(timezones[0]).toEqual({ value: "system", label: "System" });
    expect(getTimezoneLabel("system")).toBe("System");
  });

  it("returns the IANA name unchanged for every real zone", () => {
    expect(getTimezoneLabel("Asia/Tokyo")).toBe("Asia/Tokyo");
    expect(getTimezoneLabel("UTC")).toBe("UTC");
  });

  it("offers only zones Luxon can resolve, with no duplicates", () => {
    const real = timezones.filter(tz => tz.value !== "system");

    expect(real.length).toBeGreaterThan(0);
    for (const tz of real) {
      expect(DateTime.now().setZone(tz.value).isValid, tz.value).toBe(true);
    }
    expect(new Set(timezones.map(tz => tz.value)).size).toBe(timezones.length);
  });
});

describe("precomputed labels", () => {
  it("lists weekdays Monday-first", () => {
    expect(longDayNames).toEqual(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);
    expect(shortDayNames).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  });

  it("lists all 24 hours in the detected 12-hour format", () => {
    expect(hourLabels).toHaveLength(24);
    expect(hourLabels[0]).toBe("12 AM");
    expect(hourLabels[13]).toBe("1 PM");

    expect(hourMinuteLabels).toHaveLength(24);
    expect(hourMinuteLabels[0]).toBe("12:00 AM");
    expect(hourMinuteLabels[13]).toBe("1:00 PM");
  });
});
