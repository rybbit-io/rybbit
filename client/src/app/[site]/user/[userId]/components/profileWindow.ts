import { DateTime } from "luxon";
import { Time } from "../../../../../components/DateSelector/types";
import { getAbsoluteBounds } from "../../../../../lib/time";

export interface ProfileWindow {
  /** First day of the selected period, ISO date in the dashboard's timezone. */
  start: string;
  /** Last day of it that has begun: a period running into the future stops at today. */
  end: string;
  /** Days from `start` to `end`, both included. */
  days: number;
}

/**
 * The selected period as whole days, for "active days of N" and for marking
 * the period on the activity calendar. Null where days are not the unit: all
 * time has no bounds and a past-minutes window is shorter than a day's worth
 * of meaning.
 */
export function profileWindow(time: Time, zone: string, now: DateTime = DateTime.now()): ProfileWindow | null {
  if (time.mode === "past-minutes") return null;
  const bounds = getAbsoluteBounds(time, zone);
  if (!bounds) return null;

  const today = now.setZone(zone).startOf("day");
  const first = bounds.start.startOf("day");
  // The end bound is exclusive: the last day covered is the one its final instant falls in.
  const lastCovered = bounds.end.minus({ milliseconds: 1 }).startOf("day");
  const last = lastCovered > today ? today : lastCovered;
  if (last < first) return null;

  const start = first.toISODate();
  const end = last.toISODate();
  if (!start || !end) return null;

  return { start, end, days: Math.round(last.diff(first, "days").days) + 1 };
}

/**
 * The shared window label prints both ends even when they are the same day
 * ("Sep 30 – Sep 30", or "Sep 30 – Sep 30, 2025"). On the profile that reads
 * as a range, so a one-day window names its day once.
 */
export function singleDayLabel(label: string | null): string | null {
  return label ? label.replace(/^(.+) – \1(, \d{4})?$/, "$1$2") : label;
}
