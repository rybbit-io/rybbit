import { getAbsoluteBounds, hasRangeTimes, toRangeWithTimes } from "@/lib/time";
import { DateTime } from "luxon";
import { Time } from "./types";

/**
 * The four editable bounds behind the picker's From/To rows.
 *
 * They are held as strings rather than derived from the draft on every
 * keystroke, so a half-typed date is never rewritten under the cursor; a value
 * only becomes a `Time` once it parses.
 */
export type RangeFields = { startDate: string; startTime: string; endDate: string; endTime: string };

export const EMPTY_RANGE_FIELDS: RangeFields = { startDate: "", startTime: "", endDate: "", endTime: "" };

/**
 * The stored end bound is exclusive. A whole-day range shows the last day it
 * actually includes; a range carrying an explicit clock shows the instant the
 * user named. Each is the reading its own shape invites, and both round-trip
 * through {@link timeFromRangeFields}.
 */
export function rangeFieldsForTime(time: Time, zone: string): RangeFields {
  const bounds = getAbsoluteBounds(time, zone);
  if (!bounds) return EMPTY_RANGE_FIELDS;

  const exact = hasRangeTimes(time) || time.mode === "past-minutes";
  return {
    startDate: bounds.start.toISODate() ?? "",
    startTime: exact ? bounds.start.toFormat("HH:mm") : "",
    endDate: (exact ? bounds.end : bounds.end.minus({ days: 1 })).toISODate() ?? "",
    endTime: exact ? bounds.end.toFormat("HH:mm") : "",
  };
}

/**
 * A day boundary. `startOf("day")` is DST-safe: in the rare zones whose clocks
 * jump at midnight it lands on the first instant the day actually has.
 */
function parseDay(date: string, zone: string): DateTime | null {
  const parsed = DateTime.fromISO(date, { zone }).startOf("day");
  return parsed.isValid && parsed.toISODate() === date ? parsed : null;
}

/**
 * A named wall time, rejected unless it round-trips.
 *
 * Luxon resolves a wall time that DST skipped by shifting it forward — 02:30 on
 * a spring-forward morning in New York silently becomes 03:30. Accepting that
 * would leave the field showing an hour the query does not use.
 */
function parseInstant(date: string, clock: string, zone: string): DateTime | null {
  const parsed = DateTime.fromISO(`${date}T${clock}`, { zone });
  if (!parsed.isValid) return null;
  return parsed.toISODate() === date && parsed.toFormat("HH:mm") === clock ? parsed : null;
}

/**
 * `null` for anything that isn't yet a usable window — a half-filled row, an
 * unparseable or DST-skipped value, an end at or before the start, or a bound
 * past `maxDate` (the calendar disables future days, so typed values have to
 * agree). The caller keeps its last good draft and refuses to apply.
 */
export function timeFromRangeFields(fields: RangeFields, zone: string, maxDate?: string): Time | null {
  if (!fields.startDate || !fields.endDate) return null;
  if (maxDate && (fields.startDate > maxDate || fields.endDate > maxDate)) return null;

  const start = fields.startTime
    ? parseInstant(fields.startDate, fields.startTime, zone)
    : parseDay(fields.startDate, zone);
  const end = fields.endTime
    ? parseInstant(fields.endDate, fields.endTime, zone)
    : parseDay(fields.endDate, zone)?.plus({ days: 1 });

  if (!start || !end || end <= start) return null;

  // Naming no clock on either end keeps this a plain date range, which is the
  // cheaper `start_date`/`end_date` shape on the wire.
  if (!fields.startTime && !fields.endTime) {
    return { mode: "range", startDate: fields.startDate, endDate: fields.endDate };
  }
  return toRangeWithTimes(start, end);
}

/**
 * Move the days under a selection, keeping whatever clock is already set —
 * picking dates on the calendar should not silently discard the times the user
 * typed a moment earlier.
 */
export function timeFromSelectedDays(from: string, to: string, current: Time, zone: string): Time {
  const bounds = getAbsoluteBounds(current, zone);

  if (hasRangeTimes(current) && bounds) {
    const start = DateTime.fromISO(`${from}T${bounds.start.toFormat("HH:mm:ss")}`, { zone });
    const end = DateTime.fromISO(`${to}T${bounds.end.toFormat("HH:mm:ss")}`, { zone });
    if (end > start) return toRangeWithTimes(start, end);
  }

  // A single day stays `mode: "day"`: that is what buckets it hourly, where a
  // one-day `range` would fall through the coarser date-only bucket table.
  if (from === to) return { mode: "day", day: from };
  return { mode: "range", startDate: from, endDate: to };
}

/** "Aug 15 – Aug 21" for a window whose end is stored exclusive. */
export function describeBounds(bounds: { start: DateTime; end: DateTime } | null): string | null {
  if (!bounds) return null;
  return `${bounds.start.toFormat("MMM d")} – ${bounds.end.minus({ minutes: 1 }).toFormat("MMM d")}`;
}
