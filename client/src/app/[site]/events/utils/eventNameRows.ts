import { DateTime } from "luxon";
import { EventName, EventNameStats } from "../../../../api/analytics/endpoints";

export interface EventNameRow {
  eventName: string;
  count: number;
  users: number;
  /** Events per user who fired it. */
  perUser: number;
  /** Share of every custom event in the period, 0–1. */
  share: number;
  /** Null when the timestamp cannot be read. */
  lastSeen: DateTime | null;
  /** One value per trend bucket up to now, oldest first. */
  trend: number[];
  /** The comparison period's count. Undefined when there is no comparison. */
  previousCount: number | undefined;
}

export type EventNameSortKey = "name" | "count" | "users" | "perUser" | "change" | "lastSeen";
export type SortDirection = "asc" | "desc";

/**
 * Joins the period's per-name stats to the comparison period's counts.
 *
 * `now` trims the trend: the server fills buckets to the end of the period, so
 * a month in progress would otherwise end in a run of zeros for days that have
 * not happened.
 */
export function buildEventNameRows(
  stats: EventNameStats | undefined,
  previous: EventName[] | undefined,
  zone: string,
  now: DateTime = DateTime.now()
): EventNameRow[] {
  if (!stats) return [];

  const started = stats.buckets.filter(bucket => {
    const time = DateTime.fromSQL(bucket, { zone });
    return !time.isValid || time <= now;
  }).length;
  const total = stats.events.reduce((sum, event) => sum + event.count, 0);
  const previousCounts = previous ? new Map(previous.map(event => [String(event.eventName), event.count])) : null;

  return stats.events.map(event => {
    const lastSeen = DateTime.fromSQL(event.lastSeen, { zone: "utc" });
    return {
      eventName: event.eventName,
      count: event.count,
      users: event.users,
      perUser: event.users > 0 ? event.count / event.users : 0,
      share: total > 0 ? event.count / total : 0,
      lastSeen: lastSeen.isValid ? lastSeen : null,
      trend: event.trend.slice(0, started),
      // A name missing from the comparison period fired zero times in it.
      previousCount: previousCounts ? (previousCounts.get(event.eventName) ?? 0) : undefined,
    };
  });
}

/** Names in the period that the comparison period does not have. Undefined when there is no comparison. */
export function countNewEventNames(
  stats: EventNameStats | undefined,
  previous: EventName[] | undefined
): number | undefined {
  if (!stats || !previous) return undefined;
  const before = new Set(previous.map(event => String(event.eventName)));
  return stats.events.filter(event => !before.has(event.eventName)).length;
}

// Relative change, with a name that is new in this period ranked above any finite rise.
const changeOf = (row: EventNameRow): number => {
  if (row.previousCount === undefined) return 0;
  if (row.previousCount === 0) return row.count > 0 ? Number.POSITIVE_INFINITY : 0;
  return (row.count - row.previousCount) / row.previousCount;
};

const SORT_VALUE: Record<Exclude<EventNameSortKey, "name">, (row: EventNameRow) => number> = {
  count: row => row.count,
  users: row => row.users,
  perUser: row => row.perUser,
  change: changeOf,
  lastSeen: row => row.lastSeen?.toMillis() ?? 0,
};

/** Ties fall back to the count, then the name, so the order never shuffles between renders. */
export function sortEventNameRows(
  rows: EventNameRow[],
  key: EventNameSortKey,
  direction: SortDirection
): EventNameRow[] {
  const sign = direction === "asc" ? 1 : -1;
  return rows.toSorted((a, b) => {
    if (key === "name") return sign * a.eventName.localeCompare(b.eventName);
    const value = SORT_VALUE[key];
    const difference = value(a) - value(b);
    // Infinity - Infinity is NaN: two new names tie.
    const primary = Number.isNaN(difference) ? 0 : difference;
    return sign * primary || b.count - a.count || a.eventName.localeCompare(b.eventName);
  });
}

export function filterEventNameRows(rows: EventNameRow[], search: string): EventNameRow[] {
  const query = search.trim().toLowerCase();
  return query ? rows.filter(row => row.eventName.toLowerCase().includes(query)) : rows;
}
