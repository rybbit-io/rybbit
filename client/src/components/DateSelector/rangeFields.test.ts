import { getAbsoluteBounds } from "@/lib/time";
import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import {
  describeBounds,
  rangeFieldsForTime,
  timeFromRangeFields,
  timeFromSelectedDays,
  type RangeFields,
} from "./rangeFields";
import { Time } from "./types";

const ZONE = "America/New_York";

const fields = (overrides: Partial<RangeFields> = {}): RangeFields => ({
  startDate: "",
  startTime: "",
  endDate: "",
  endTime: "",
  ...overrides,
});

describe("rangeFieldsForTime", () => {
  it("shows a whole-day range by the last day it includes, with the clocks left empty", () => {
    expect(rangeFieldsForTime({ mode: "range", startDate: "2024-03-08", endDate: "2024-03-14" }, ZONE)).toEqual(
      fields({ startDate: "2024-03-08", endDate: "2024-03-14" })
    );
  });

  it("shows a range with times by the instants it was given", () => {
    const time: Time = {
      mode: "range",
      startDate: "2024-03-08",
      startTime: "09:30:00",
      endDate: "2024-03-08",
      endTime: "17:00:00",
    };
    expect(rangeFieldsForTime(time, ZONE)).toEqual(
      fields({ startDate: "2024-03-08", startTime: "09:30", endDate: "2024-03-08", endTime: "17:00" })
    );
  });

  it("seeds from a day, week, month or year without inventing clocks", () => {
    expect(rangeFieldsForTime({ mode: "day", day: "2024-03-15" }, ZONE)).toEqual(
      fields({ startDate: "2024-03-15", endDate: "2024-03-15" })
    );
    expect(rangeFieldsForTime({ mode: "week", week: "2024-03-11" }, ZONE)).toEqual(
      fields({ startDate: "2024-03-11", endDate: "2024-03-17" })
    );
    expect(rangeFieldsForTime({ mode: "month", month: "2024-02-01" }, ZONE)).toEqual(
      fields({ startDate: "2024-02-01", endDate: "2024-02-29" })
    );
    expect(rangeFieldsForTime({ mode: "year", year: "2024-01-01" }, ZONE)).toEqual(
      fields({ startDate: "2024-01-01", endDate: "2024-12-31" })
    );
  });

  it("seeds a realtime window with real clocks, so editing one produces a range", () => {
    const seeded = rangeFieldsForTime({ mode: "past-minutes", pastMinutesStart: 60, pastMinutesEnd: 0 }, ZONE);
    expect(seeded.startTime).toMatch(/^\d{2}:\d{2}$/);
    expect(seeded.endTime).toMatch(/^\d{2}:\d{2}$/);
  });

  it("leaves every field empty for all-time, which has no bounds", () => {
    expect(rangeFieldsForTime({ mode: "all-time" }, ZONE)).toEqual(fields());
  });
});

describe("timeFromRangeFields", () => {
  it("stays a plain date range when neither clock is named", () => {
    expect(timeFromRangeFields(fields({ startDate: "2024-03-08", endDate: "2024-03-14" }), ZONE)).toEqual({
      mode: "range",
      startDate: "2024-03-08",
      endDate: "2024-03-14",
    });
  });

  it("naming a clock promotes the window to an exact range", () => {
    expect(
      timeFromRangeFields(
        fields({ startDate: "2024-03-08", startTime: "09:30", endDate: "2024-03-08", endTime: "17:00" }),
        ZONE
      )
    ).toEqual({
      mode: "range",
      startDate: "2024-03-08",
      startTime: "09:30:00",
      endDate: "2024-03-08",
      endTime: "17:00:00",
    });
  });

  it("a start clock alone runs to the midnight after the end date", () => {
    expect(
      timeFromRangeFields(fields({ startDate: "2024-03-08", startTime: "09:30", endDate: "2024-03-08" }), ZONE)
    ).toEqual({
      mode: "range",
      startDate: "2024-03-08",
      startTime: "09:30:00",
      endDate: "2024-03-09",
      endTime: "00:00:00",
    });
  });

  it("refuses anything that is not yet a usable window", () => {
    expect(timeFromRangeFields(fields({ startDate: "2024-03-08" }), ZONE)).toBeNull();
    expect(timeFromRangeFields(fields({ endDate: "2024-03-08" }), ZONE)).toBeNull();
    expect(timeFromRangeFields(fields({ startDate: "2024-03-14", endDate: "2024-03-08" }), ZONE)).toBeNull();
    expect(
      timeFromRangeFields(
        fields({ startDate: "2024-03-08", startTime: "17:00", endDate: "2024-03-08", endTime: "09:00" }),
        ZONE
      )
    ).toBeNull();
    expect(timeFromRangeFields(fields({ startDate: "not-a-date", endDate: "2024-03-08" }), ZONE)).toBeNull();
  });

  it("an end equal to the start is not a window", () => {
    expect(
      timeFromRangeFields(
        fields({ startDate: "2024-03-08", startTime: "09:00", endDate: "2024-03-08", endTime: "09:00" }),
        ZONE
      )
    ).toBeNull();
  });

  it("refuses a bound past the maximum the calendar enforces", () => {
    const future = fields({ startDate: "2024-03-08", endDate: "2024-03-20" });
    expect(timeFromRangeFields(future, ZONE)).not.toBeNull();
    expect(timeFromRangeFields(future, ZONE, "2024-03-14")).toBeNull();
    expect(
      timeFromRangeFields(fields({ startDate: "2024-03-20", endDate: "2024-03-25" }), ZONE, "2024-03-14")
    ).toBeNull();
  });

  it("accepts a bound landing exactly on the maximum", () => {
    expect(timeFromRangeFields(fields({ startDate: "2024-03-08", endDate: "2024-03-14" }), ZONE, "2024-03-14")).toEqual(
      {
        mode: "range",
        startDate: "2024-03-08",
        endDate: "2024-03-14",
      }
    );
  });

  it("refuses a wall time DST skipped rather than silently shifting it", () => {
    // 02:30 does not exist in New York on 2024-03-10; Luxon would resolve it to
    // 03:30, leaving the field showing an hour the query never used
    expect(
      timeFromRangeFields(
        fields({ startDate: "2024-03-10", startTime: "02:30", endDate: "2024-03-10", endTime: "17:00" }),
        ZONE
      )
    ).toBeNull();
    // the hour either side of the gap is fine
    expect(
      timeFromRangeFields(
        fields({ startDate: "2024-03-10", startTime: "01:30", endDate: "2024-03-10", endTime: "17:00" }),
        ZONE
      )
    ).not.toBeNull();
    // and the same wall time is real in a zone without that transition
    expect(
      timeFromRangeFields(
        fields({ startDate: "2024-03-10", startTime: "02:30", endDate: "2024-03-10", endTime: "17:00" }),
        "UTC"
      )
    ).not.toBeNull();
  });

  it("still spans a whole day across a DST transition", () => {
    const spring = timeFromRangeFields(fields({ startDate: "2024-03-10", endDate: "2024-03-10" }), ZONE);
    expect(spring).toEqual({ mode: "range", startDate: "2024-03-10", endDate: "2024-03-10" });
    const bounds = getAbsoluteBounds(spring!, ZONE)!;
    expect(bounds.end.diff(bounds.start, "hours").hours).toBe(23);
  });

  it("round-trips: fields to time to fields is stable", () => {
    const cases: Time[] = [
      { mode: "range", startDate: "2024-03-08", endDate: "2024-03-14" },
      { mode: "range", startDate: "2024-03-08", startTime: "09:30:00", endDate: "2024-03-09", endTime: "17:00:00" },
      { mode: "day", day: "2024-03-15" },
      { mode: "month", month: "2024-02-01" },
    ];

    for (const time of cases) {
      const seeded = rangeFieldsForTime(time, ZONE);
      const parsed = timeFromRangeFields(seeded, ZONE);
      expect(parsed).not.toBeNull();
      expect(rangeFieldsForTime(parsed!, ZONE)).toEqual(seeded);
    }
  });

  it("the window a day seeds covers exactly that day", () => {
    const parsed = timeFromRangeFields(rangeFieldsForTime({ mode: "day", day: "2024-03-15" }, ZONE), ZONE)!;
    const bounds = getAbsoluteBounds(parsed, ZONE)!;
    expect(bounds.start.toISODate()).toBe("2024-03-15");
    expect(bounds.end.toISODate()).toBe("2024-03-16");
  });
});

describe("timeFromSelectedDays", () => {
  const dateOnly: Time = { mode: "range", startDate: "2024-03-08", endDate: "2024-03-14" };
  const exact: Time = {
    mode: "range",
    startDate: "2024-03-08",
    startTime: "09:30:00",
    endDate: "2024-03-09",
    endTime: "17:00:00",
  };

  it("a single day collapses to day mode, which is what buckets it hourly", () => {
    expect(timeFromSelectedDays("2024-03-15", "2024-03-15", dateOnly, ZONE)).toEqual({
      mode: "day",
      day: "2024-03-15",
    });
  });

  it("two days make a plain range", () => {
    expect(timeFromSelectedDays("2024-03-01", "2024-03-05", dateOnly, ZONE)).toEqual({
      mode: "range",
      startDate: "2024-03-01",
      endDate: "2024-03-05",
    });
  });

  it("keeps the clocks already set when the days move under them", () => {
    expect(timeFromSelectedDays("2024-04-01", "2024-04-10", exact, ZONE)).toEqual({
      mode: "range",
      startDate: "2024-04-01",
      startTime: "09:30:00",
      endDate: "2024-04-10",
      endTime: "17:00:00",
    });
  });

  it("falls back to a whole day when the kept clocks would invert the window", () => {
    const inverted: Time = {
      mode: "range",
      startDate: "2024-03-08",
      startTime: "17:00:00",
      endDate: "2024-03-09",
      endTime: "09:00:00",
    };
    expect(timeFromSelectedDays("2024-04-01", "2024-04-01", inverted, ZONE)).toEqual({
      mode: "day",
      day: "2024-04-01",
    });
  });
});

describe("describeBounds", () => {
  it("names the last day a window includes, not its exclusive end", () => {
    const bounds = getAbsoluteBounds({ mode: "range", startDate: "2024-03-08", endDate: "2024-03-14" }, ZONE);
    expect(describeBounds(bounds)).toBe("Mar 8 – Mar 14");
  });

  it("has nothing to say about all-time", () => {
    expect(describeBounds(null)).toBeNull();
  });

  it("keeps a same-day window on one day", () => {
    const bounds = {
      start: DateTime.fromISO("2024-03-08T09:30", { zone: ZONE }),
      end: DateTime.fromISO("2024-03-08T17:00", { zone: ZONE }),
    };
    expect(describeBounds(bounds)).toBe("Mar 8 – Mar 8");
  });
});
