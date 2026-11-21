import { DateTime } from "luxon";

// Pure layout and statistics for the profile's activity calendar. Days are ISO
// dates ("2026-09-14") in the dashboard's timezone, the same days the
// session-count endpoint buckets by.

export const CALENDAR_WEEKS = 18;

/** 0 is an empty day; 1 to 3 are the three steps of the data hue. */
export type ActivityLevel = 0 | 1 | 2 | 3;

export interface CalendarDay {
  date: string;
  sessions: number;
  level: ActivityLevel;
  /** Earlier than the user's first recorded session: drawn as an outline. */
  beforeFirstVisit: boolean;
}

export interface CalendarWeek {
  /** Monday of the week. */
  start: string;
  /** Monday first. Null for days that have not happened yet. */
  days: (CalendarDay | null)[];
}

export interface DayCount {
  date: string;
  sessions: number;
}

/** The first day with a session, or null for a user with none. */
export function firstActiveDay(counts: DayCount[]): string | null {
  return counts.reduce<string | null>(
    (first, day) => (day.sessions > 0 && (first === null || day.date < first) ? day.date : first),
    null
  );
}

/**
 * The session count that earns the darkest step. Taken near the top of the
 * user's own days so one outlier does not wash out every other day, and never
 * below three so a visitor who comes once a day reads as light, not saturated.
 */
export function activityCeiling(counts: DayCount[]): number {
  const active = counts
    .map(day => day.sessions)
    .filter(sessions => sessions > 0)
    .sort((a, b) => a - b);
  if (active.length === 0) return 3;
  return Math.max(3, active[Math.floor((active.length - 1) * 0.95)]);
}

export function activityLevel(sessions: number, ceiling: number): ActivityLevel {
  if (sessions <= 0) return 0;
  return Math.min(3, Math.max(1, Math.ceil((sessions / ceiling) * 3))) as ActivityLevel;
}

/**
 * The last `weeks` weeks ending with the week `today` falls in, oldest first.
 */
export function buildCalendarWeeks(counts: DayCount[], today: DateTime, weeks = CALENDAR_WEEKS): CalendarWeek[] {
  const byDate = new Map(counts.map(day => [day.date, day.sessions]));
  const firstVisit = firstActiveDay(counts);
  const ceiling = activityCeiling(counts);
  const todayIso = today.toISODate() ?? "";
  const firstMonday = today.startOf("week").minus({ weeks: weeks - 1 });

  return Array.from({ length: weeks }, (_, weekIndex) => {
    const monday = firstMonday.plus({ weeks: weekIndex });
    return {
      start: monday.toISODate() ?? "",
      days: Array.from({ length: 7 }, (_, dayIndex) => {
        const date = monday.plus({ days: dayIndex }).toISODate() ?? "";
        if (date > todayIso) return null;
        const sessions = byDate.get(date) ?? 0;
        return {
          date,
          sessions,
          level: activityLevel(sessions, ceiling),
          beforeFirstVisit: firstVisit === null || date < firstVisit,
        };
      }),
    };
  });
}

/**
 * Where each month's label goes: the week that holds its first drawn day. A
 * week is filed under the month of its last drawn day, so the week with the
 * 1st in it opens the new month. `month` is "2026-09".
 */
export function monthLabelColumns(weeks: CalendarWeek[]): { month: string; column: number }[] {
  const labels: { month: string; column: number }[] = [];
  weeks.forEach((week, column) => {
    const lastDay = [...week.days].reverse().find(day => day !== null);
    if (!lastDay) return;
    const month = lastDay.date.slice(0, 7);
    if (labels[labels.length - 1]?.month !== month) labels.push({ month, column });
  });
  return labels;
}

/**
 * The columns a date range covers, clamped to the calendar. Null when the
 * range lies wholly outside it. `end` is inclusive.
 */
export function rangeColumns(weeks: CalendarWeek[], start: string, end: string): { from: number; to: number } | null {
  if (weeks.length === 0 || start > end) return null;
  const sundayOf = (week: CalendarWeek) => DateTime.fromISO(week.start).plus({ days: 6 }).toISODate() ?? "";

  const from = weeks.findIndex(week => sundayOf(week) >= start);
  if (from === -1) return null;

  let to = -1;
  weeks.forEach((week, column) => {
    if (week.start <= end) to = column;
  });
  return to < from ? null : { from, to };
}

export interface ActivityStats {
  /** Longest run of consecutive days with a session. */
  longestStreak: number;
  /** ISO weekday (1 = Monday) with the most sessions, or null with no sessions. */
  busiestWeekday: number | null;
}

/**
 * Streak and busiest weekday over the days from `start` to `end` inclusive.
 * Pass nulls to read the user's whole history.
 */
export function activityStats(counts: DayCount[], start: string | null, end: string | null): ActivityStats {
  const active = counts
    .filter(day => day.sessions > 0 && (start === null || day.date >= start) && (end === null || day.date <= end))
    .sort((a, b) => a.date.localeCompare(b.date));

  let longestStreak = 0;
  let streak = 0;
  let previous: DateTime | null = null;
  const perWeekday = new Map<number, number>();

  for (const day of active) {
    const date = DateTime.fromISO(day.date);
    streak = previous !== null && Math.round(date.diff(previous, "days").days) === 1 ? streak + 1 : 1;
    longestStreak = Math.max(longestStreak, streak);
    previous = date;
    perWeekday.set(date.weekday, (perWeekday.get(date.weekday) ?? 0) + day.sessions);
  }

  // Ties go to the earlier weekday, so the answer does not depend on row order.
  let busiestWeekday: number | null = null;
  for (let weekday = 1; weekday <= 7; weekday++) {
    const sessions = perWeekday.get(weekday) ?? 0;
    if (sessions > 0 && (busiestWeekday === null || sessions > (perWeekday.get(busiestWeekday) ?? 0))) {
      busiestWeekday = weekday;
    }
  }

  return { longestStreak, busiestWeekday };
}
