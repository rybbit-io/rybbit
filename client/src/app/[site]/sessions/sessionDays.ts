import { DateTime } from "luxon";

/**
 * The calendar day a session started on, in the viewer's timezone, as
 * YYYY-MM-DD. The sessions summary keys its per-day counts the same way.
 */
export function sessionDayKey(sessionStart: string, zone: string): string {
  return DateTime.fromSQL(sessionStart, { zone: "utc" }).setZone(zone).toISODate() ?? "";
}

export interface SessionDayGroup<T> {
  day: string;
  sessions: T[];
}

/**
 * Splits a list that is already in start-time order into runs of the same
 * day. Order is kept as given, so it works for newest-first and oldest-first.
 */
export function groupSessionsByDay<T extends { session_start: string }>(
  sessions: T[],
  zone: string
): SessionDayGroup<T>[] {
  const groups: SessionDayGroup<T>[] = [];
  for (const session of sessions) {
    const day = sessionDayKey(session.session_start, zone);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.sessions.push(session);
    else groups.push({ day, sessions: [session] });
  }
  return groups;
}

/** Whether a day key is today or yesterday in the viewer's timezone. */
export function relativeDay(day: string, zone: string, now: DateTime = DateTime.now()): "today" | "yesterday" | null {
  const today = now.setZone(zone);
  if (day === today.toISODate()) return "today";
  if (day === today.minus({ days: 1 }).toISODate()) return "yesterday";
  return null;
}
