import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import {
  activityCeiling,
  activityLevel,
  activityStats,
  buildCalendarWeeks,
  firstActiveDay,
  monthLabelColumns,
  rangeColumns,
} from "./calendarLayout";

// Wednesday.
const today = DateTime.fromISO("2026-09-30", { zone: "utc" });
const day = (date: string, sessions: number) => ({ date, sessions });

describe("buildCalendarWeeks", () => {
  const counts = [day("2026-08-12", 1), day("2026-09-28", 2), day("2026-09-30", 3)];
  const weeks = buildCalendarWeeks(counts, today, 18);

  it("ends with the week today falls in and starts every week on Monday", () => {
    expect(weeks).toHaveLength(18);
    expect(weeks[17].start).toBe("2026-09-28");
    expect(weeks[0].start).toBe("2026-06-01");
    expect(weeks.every(week => DateTime.fromISO(week.start).weekday === 1)).toBe(true);
  });

  it("leaves out days that have not happened yet", () => {
    expect(weeks[17].days.map(d => d?.date ?? null)).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      null,
      null,
      null,
      null,
    ]);
  });

  it("marks the days before the first session, and only those", () => {
    const all = weeks.flatMap(week => week.days).filter(d => d !== null);
    expect(all.find(d => d.date === "2026-08-11")?.beforeFirstVisit).toBe(true);
    expect(all.find(d => d.date === "2026-08-12")?.beforeFirstVisit).toBe(false);
    expect(all.find(d => d.date === "2026-08-13")?.beforeFirstVisit).toBe(false);
  });

  it("carries each day's sessions and level", () => {
    expect(weeks[17].days[0]).toEqual({ date: "2026-09-28", sessions: 2, level: 2, beforeFirstVisit: false });
    expect(weeks[17].days[1]).toEqual({ date: "2026-09-29", sessions: 0, level: 0, beforeFirstVisit: false });
    expect(weeks[17].days[2]?.level).toBe(3);
  });

  it("treats every day as before the first visit for a user with no sessions", () => {
    const empty = buildCalendarWeeks([], today, 2);
    expect(empty.flatMap(week => week.days).every(d => d === null || d.beforeFirstVisit)).toBe(true);
  });
});

describe("activity levels", () => {
  it("never saturates a visitor who comes once a day", () => {
    const counts = [day("2026-09-01", 1), day("2026-09-02", 1)];
    expect(activityCeiling(counts)).toBe(3);
    expect(activityLevel(1, 3)).toBe(1);
    expect(activityLevel(2, 3)).toBe(2);
    expect(activityLevel(3, 3)).toBe(3);
    expect(activityLevel(9, 3)).toBe(3);
    expect(activityLevel(0, 3)).toBe(0);
  });

  it("scales to a heavy user without letting one outlier flatten the rest", () => {
    const counts = [
      ...Array.from({ length: 30 }, (_, i) => day(`2026-08-${String(i + 1).padStart(2, "0")}`, 6)),
      day("2026-09-01", 200),
    ];
    expect(activityCeiling(counts)).toBe(6);
    expect(activityLevel(2, 6)).toBe(1);
    expect(activityLevel(4, 6)).toBe(2);
  });
});

describe("firstActiveDay", () => {
  it("is the earliest day with a session, whatever the row order", () => {
    expect(firstActiveDay([day("2026-09-02", 1), day("2026-08-12", 2), day("2026-08-01", 0)])).toBe("2026-08-12");
    expect(firstActiveDay([])).toBeNull();
  });
});

describe("monthLabelColumns", () => {
  it("puts each month on the week that holds its first day", () => {
    const labels = monthLabelColumns(buildCalendarWeeks([], today, 18));
    expect(labels).toEqual([
      { month: "2026-06", column: 0 },
      { month: "2026-07", column: 4 },
      { month: "2026-08", column: 8 },
      { month: "2026-09", column: 13 },
    ]);
  });

  it("does not label a month none of whose days are drawn", () => {
    // The last week runs into October, but today is still in September.
    const labels = monthLabelColumns(buildCalendarWeeks([], today, 2));
    expect(labels.map(label => label.month)).toEqual(["2026-09"]);
  });
});

describe("rangeColumns", () => {
  const weeks = buildCalendarWeeks([], today, 18);

  it("covers the weeks a range touches", () => {
    expect(rangeColumns(weeks, "2026-09-01", "2026-09-30")).toEqual({ from: 13, to: 17 });
    expect(rangeColumns(weeks, "2026-09-14", "2026-09-14")).toEqual({ from: 15, to: 15 });
  });

  it("clamps a range that starts before the calendar", () => {
    expect(rangeColumns(weeks, "2026-01-01", "2026-06-10")).toEqual({ from: 0, to: 1 });
  });

  it("is null for a range the calendar does not show", () => {
    expect(rangeColumns(weeks, "2026-01-01", "2026-03-01")).toBeNull();
    expect(rangeColumns(weeks, "2026-10-10", "2026-10-20")).toBeNull();
  });
});

describe("activityStats", () => {
  const counts = [
    day("2026-08-31", 4),
    day("2026-09-01", 2),
    day("2026-09-02", 1),
    day("2026-09-03", 3),
    day("2026-09-05", 0),
    day("2026-09-07", 2),
    day("2026-09-08", 2),
    // Monday again: Mondays total 2 + 3 inside September.
    day("2026-09-14", 3),
  ];

  it("finds the longest run of consecutive active days inside the range", () => {
    expect(activityStats(counts, "2026-09-01", "2026-09-30").longestStreak).toBe(3);
    // The day before the range would extend the run to four.
    expect(activityStats(counts, null, null).longestStreak).toBe(4);
  });

  it("names the weekday with the most sessions", () => {
    // Mon 5, Tue 4, Wed 1, Thu 3 inside September.
    expect(activityStats(counts, "2026-09-01", "2026-09-30").busiestWeekday).toBe(1);
  });

  it("breaks a tie towards the earlier weekday", () => {
    expect(activityStats([day("2026-09-03", 2), day("2026-09-01", 2)], null, null).busiestWeekday).toBe(2);
  });

  it("has nothing to say about a range with no sessions", () => {
    expect(activityStats(counts, "2026-07-01", "2026-07-31")).toEqual({ longestStreak: 0, busiestWeekday: null });
  });
});
