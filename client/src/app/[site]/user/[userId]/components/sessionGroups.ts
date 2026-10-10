import { DateTime } from "luxon";
import { GetSessionsResponse } from "../../../../../api/analytics/endpoints";

export type SessionBreakdown = "day" | "week" | "none";

type Session = GetSessionsResponse[number];

export interface SessionGroup {
  /** ISO date of the day, or of the Monday that opens the week. */
  key: string;
  sessions: Session[];
  /** Seconds, summed over the listed sessions. */
  duration: number;
  pageviews: number;
}

const sessionStart = (session: Session, zone: string) =>
  DateTime.fromSQL(session.session_start, { zone: "utc" }).setZone(zone);

/**
 * Splits one page of the session list into runs that started on the same day
 * (or in the same week) in `zone`. The list arrives newest first and the order
 * is kept, so a group is always a contiguous run. Totals cover the sessions
 * listed, not the whole day: a day that continues on the next page shows what
 * this page holds of it.
 */
export function groupSessions(
  sessions: Session[],
  zone: string,
  breakdown: Exclude<SessionBreakdown, "none">
): SessionGroup[] {
  const groups: SessionGroup[] = [];

  for (const session of sessions) {
    const start = sessionStart(session, zone);
    const key = (breakdown === "week" ? start.startOf("week") : start).toISODate() ?? "";
    const current = groups[groups.length - 1];
    const group =
      current?.key === key ? current : groups[groups.push({ key, sessions: [], duration: 0, pageviews: 0 }) - 1];

    group.sessions.push(session);
    group.duration += Math.max(0, session.session_duration ?? 0);
    group.pageviews += session.pageviews ?? 0;
  }

  return groups;
}

/**
 * A group's total time. A day or a week of sessions adds up past the hour, and
 * "79m 17s" is harder to read than "1h 19m".
 */
export function formatGroupDuration(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  const rest = whole % 60;
  if (minutes > 0) return rest > 0 ? `${minutes}m ${rest}s` : `${minutes}m`;
  return `${rest}s`;
}

/** "today", "yesterday", or null: which fixed name a day has relative to `now`. */
export function relativeDay(isoDate: string, now: DateTime): "today" | "yesterday" | null {
  if (isoDate === now.toISODate()) return "today";
  if (isoDate === now.minus({ days: 1 }).toISODate()) return "yesterday";
  return null;
}
