import type { Annotation } from "@rybbit/shared";
import { DateTime, Settings } from "luxon";
import { describe, expect, it } from "vitest";
import {
  clusterAnnotations,
  formatAnnotationDate,
  parseAnnotationInstant,
  pickIconFromInput,
  dateTimeInputValue,
  fromDateTimeInput,
  toDateTimeInput,
  type PositionedAnnotation,
} from "./annotationUtils";

const base: Annotation = {
  annotationId: 1,
  siteId: 1,
  organizationId: "org",
  userId: "u",
  userName: "Bill",
  title: "Launch",
  description: null,
  date: "2026-08-18T07:00:00.000Z",
  endDate: null,
  color: null,
  icon: null,
  isPublic: false,
  createdAt: "",
  updatedAt: "",
};

const at = (annotationId: number, x: number, y: number, x2: number | null = null): PositionedAnnotation => ({
  annotation: { ...base, annotationId },
  x,
  x2,
  y,
});

describe("clusterAnnotations", () => {
  it("merges pins closer than the gap and keeps the highest point", () => {
    const clusters = clusterAnnotations([at(1, 100, 80), at(2, 110, 40), at(3, 200, 60)], 26);
    expect(clusters.map(c => c.items.length)).toEqual([2, 1]);
    expect(clusters[0].y).toBe(40);
    expect(clusters[0].x).toBe(105);
    expect(clusters[0].key).toBe("1-2");
  });

  it("measures the gap from the first pin of the group, not the last", () => {
    // Three pins 20px apart: the third is 40px from the first, so it starts a new group.
    const clusters = clusterAnnotations([at(1, 0, 0), at(2, 20, 0), at(3, 40, 0)], 26);
    expect(clusters.map(c => c.items.length)).toEqual([2, 1]);
  });

  it("sorts by x before grouping", () => {
    const clusters = clusterAnnotations([at(2, 300, 0), at(1, 10, 0), at(3, 20, 0)], 26);
    expect(clusters.map(c => c.key)).toEqual(["1-3", "2"]);
  });
});

describe("formatAnnotationDate", () => {
  it("prints a whole day as a date and an instant with its time", () => {
    // 2026-08-18T07:00Z is midnight in Los Angeles.
    expect(formatAnnotationDate(base, "America/Los_Angeles")).toBe("Aug 18, 2026");
    expect(formatAnnotationDate(base, "UTC")).toMatch(/Aug 18, 2026, 7:00/);
  });

  it("prints whole-day ranges as two dates", () => {
    const range = { ...base, date: "2026-08-11T00:00:00.000Z", endDate: "2026-08-14T23:59:59.999Z" };
    expect(formatAnnotationDate(range, "UTC")).toBe("Aug 11, 2026 – Aug 14, 2026");
  });
});

describe("toDateTimeInput", () => {
  it("gives the local wall clock in the user's timezone", () => {
    expect(toDateTimeInput("2026-08-18T07:00:00.000Z", "America/Los_Angeles")).toBe("2026-08-18T00:00");
    expect(toDateTimeInput("2026-08-18T03:30:00.000Z", "America/Los_Angeles")).toBe("2026-08-17T20:30");
  });

  it("drops seconds rather than rounding the minute up", () => {
    expect(toDateTimeInput("2026-08-14T23:59:59.999Z", "UTC")).toBe("2026-08-14T23:59");
  });

  // dateTimeUtils sets Luxon's global locale from navigator.language, and a
  // datetime-local input only accepts ASCII digits.
  it("writes ASCII digits under a locale with its own numerals", () => {
    const previous = Settings.defaultLocale;
    Settings.defaultLocale = "ar-EG";
    try {
      expect(toDateTimeInput("2026-08-18T14:10:00.000Z", "UTC")).toBe("2026-08-18T14:10");
      expect(dateTimeInputValue(DateTime.fromISO("2026-08-18T14:10", { zone: "UTC" }))).toBe("2026-08-18T14:10");
    } finally {
      Settings.defaultLocale = previous;
    }
  });

  // A DST shift can end a day at 22:59, so "the last minute of the day" has to
  // be read off the day rather than assumed to be 23:59.
  it("reads the last minute of a short DST day off the day itself", () => {
    const day = DateTime.fromISO("2026-03-28T12:00", { zone: "America/Nuuk" });
    expect(dateTimeInputValue(day.endOf("day"))).toBe("2026-03-28T22:59");
  });
});

describe("fromDateTimeInput", () => {
  it("reads the wall clock as an instant in the user's timezone", () => {
    expect(fromDateTimeInput("2026-08-18T14:10", "America/Los_Angeles")).toBe("2026-08-18T21:10:00.000Z");
    expect(fromDateTimeInput("2026-08-18T14:10", "UTC")).toBe("2026-08-18T14:10:00.000Z");
  });

  it("round-trips with toDateTimeInput", () => {
    const local = toDateTimeInput("2026-08-18T07:00:00.000Z", "Asia/Tokyo");
    expect(fromDateTimeInput(local, "Asia/Tokyo")).toBe("2026-08-18T07:00:00.000Z");
  });

  // Luxon moves a wall clock inside a spring-forward gap onto the far side of
  // it, so a later wall clock can be an earlier instant — 02:30 lands after
  // 03:00 that morning. The form compares instants for exactly this reason.
  it("normalizes a wall clock that the spring-forward gap skips", () => {
    expect(fromDateTimeInput("2026-03-08T02:30", "America/New_York")).toBe("2026-03-08T07:30:00.000Z");
    expect(fromDateTimeInput("2026-03-08T03:00", "America/New_York")).toBe("2026-03-08T07:00:00.000Z");
    expect("2026-03-08T03:00" > "2026-03-08T02:30").toBe(true);
  });
});

describe("parseAnnotationInstant", () => {
  it("reads ISO 8601 and Postgres timestamptz text alike", () => {
    expect(parseAnnotationInstant("2026-08-18T07:00:00.000Z").toMillis()).toBe(Date.UTC(2026, 7, 18, 7));
    expect(parseAnnotationInstant("2026-08-18 07:00:00+00").toMillis()).toBe(Date.UTC(2026, 7, 18, 7));
    expect(parseAnnotationInstant("2026-08-18 09:00:00+02").toMillis()).toBe(Date.UTC(2026, 7, 18, 7));
    expect(formatAnnotationDate({ ...base, date: "2026-08-18 07:00:00+00" }, "America/Los_Angeles")).toBe("Aug 18, 2026");
  });
});

describe("pickIconFromInput", () => {
  it("keeps one visible character, including multi-code-point emoji", () => {
    expect(pickIconFromInput("🚀")).toBe("🚀");
    expect(pickIconFromInput("🚀🔥")).toBe("🔥");
    expect(pickIconFromInput("👨‍👩‍👧")).toBe("👨‍👩‍👧");
    expect(pickIconFromInput("  ")).toBeNull();
  });
});
