import type { TimeBucket } from "@rybbit/shared";
import { DateTime } from "luxon";
import { hour12 } from "../../../lib/dateTimeUtils";
import { getTimezone } from "../../../lib/store";
import { GetSessionsResponse } from "../../../api/analytics/endpoints";

/**
 * The replay window to start with, in minutes, for a period of this length:
 * fine enough to see movement, coarse enough to play through in a minute or two.
 */
export function calculateWindowSize(startTime: DateTime, endTime: DateTime): number {
  const diffInMinutes = endTime.diff(startTime, "minutes").minutes;

  if (diffInMinutes <= 180) {
    // 3 hours or less: 5 minute windows
    return 5;
  } else if (diffInMinutes <= 4320) {
    // 3 days or less: 1 hour windows
    return 60;
  } else if (diffInMinutes <= 10080) {
    // 1 week or less: 3 hour windows
    return 180;
  } else if (diffInMinutes <= 44640) {
    // A month or less: 6 hour windows
    return 360;
  } else {
    // More than a month: 1 day windows
    return 1440;
  }
}

/**
 * Available window size options for the dropdown
 */
export const WINDOW_SIZE_OPTIONS = [
  { value: 1, label: "1m" },
  { value: 5, label: "5m" },
  { value: 15, label: "15m" },
  { value: 30, label: "30m" },
  { value: 60, label: "1h" },
  { value: 180, label: "3h" },
  { value: 360, label: "6h" },
  { value: 720, label: "12h" },
  { value: 1440, label: "1d" },
  { value: 4320, label: "3d" },
  { value: 10080, label: "7d" },
];

// The bar draws one column per window; past this they are thinner than a pixel
// and a year at one minute would be half a million of them.
export const MAX_WINDOWS = 1000;

const windowCount = (startTime: DateTime, endTime: DateTime, windowSize: number) =>
  Math.ceil(endTime.diff(startTime, "minutes").minutes / windowSize);

/** The window sizes that split this period into a drawable number of steps (at least two). */
export function availableWindowSizes(startTime: DateTime, endTime: DateTime) {
  const fitting = WINDOW_SIZE_OPTIONS.filter(option => {
    const count = windowCount(startTime, endTime, option.value);
    return count >= 2 && count <= MAX_WINDOWS;
  });
  // A period too long for every option still gets the coarsest one.
  return fitting.length > 0 ? fitting : WINDOW_SIZE_OPTIONS.slice(-1);
}

/** The user's window size when the period allows it, otherwise the nearest allowed default. */
export function resolveWindowSize(startTime: DateTime, endTime: DateTime, manual: number | null): number {
  const options = availableWindowSizes(startTime, endTime);
  if (manual !== null && options.some(option => option.value === manual)) return manual;

  const preferred = calculateWindowSize(startTime, endTime);
  return (options.find(option => option.value >= preferred) ?? options[options.length - 1]).value;
}

/**
 * Generate time windows for the timeline scrubber. `endTime` is exclusive: no
 * window starts at or after it.
 */
export function generateTimeWindows(startTime: DateTime, endTime: DateTime, windowSize: number): DateTime[] {
  const windows: DateTime[] = [];
  let currentTime = startTime;

  while (currentTime < endTime && windows.length < MAX_WINDOWS) {
    windows.push(currentTime);
    currentTime = currentTime.plus({ minutes: windowSize });
  }

  return windows;
}

const BUCKET_MINUTES: Partial<Record<TimeBucket, number>> = {
  minute: 1,
  five_minutes: 5,
  fifteen_minutes: 15,
  hour: 60,
  day: 1440,
};

/**
 * The time-series bucket a window's session count is summed from: the coarsest
 * one that divides the window evenly.
 */
export function bucketForWindow(windowSize: number): { bucket: TimeBucket; minutes: number } {
  const bucket: TimeBucket =
    windowSize >= 1440
      ? "day"
      : windowSize >= 60
        ? "hour"
        : windowSize >= 15
          ? "fifteen_minutes"
          : windowSize >= 5
            ? "five_minutes"
            : "minute";
  return { bucket, minutes: BUCKET_MINUTES[bucket] ?? 1 };
}

/**
 * Sessions started in each window, from a time series bucketed by
 * {@link bucketForWindow}. A session is counted in the bucket it started in, so
 * summing buckets counts every session once.
 */
export function sumIntoWindows(
  points: { time: string; sessions: number }[],
  startTime: DateTime,
  windowSize: number,
  count: number,
  bucketMinutes: number,
  timezone: string
): number[] {
  const totals = new Array<number>(count).fill(0);
  const windowMs = windowSize * 60_000;
  // Half a bucket of slack keeps a day bucket in its own window when a
  // daylight-saving shift moves local midnight by an hour.
  const slackMs = (bucketMinutes * 60_000) / 2;
  const startMs = startTime.toMillis();

  for (const point of points) {
    const at = DateTime.fromSQL(point.time, { zone: timezone }).toMillis();
    if (Number.isNaN(at)) continue;
    const index = Math.floor((at - startMs + slackMs) / windowMs);
    if (index >= 0 && index < count) totals[index] += point.sessions ?? 0;
  }

  return totals;
}

/**
 * Check if a session overlaps with a given time window
 */
export function sessionOverlapsWindow(
  session: GetSessionsResponse[number],
  windowStart: DateTime,
  windowEnd: DateTime,
  timezone?: string
): boolean {
  const tz = timezone ?? getTimezone();
  const sessionStart = DateTime.fromSQL(session.session_start, { zone: "utc" }).setZone(tz);
  const sessionEnd = DateTime.fromSQL(session.session_end, { zone: "utc" }).setZone(tz);

  // Session overlaps if:
  // - It starts before the window ends AND
  // - It ends after the window starts
  return sessionStart < windowEnd && sessionEnd > windowStart;
}

/**
 * Filter sessions that are active during a specific time window
 */
export function getActiveSessions(
  sessions: GetSessionsResponse,
  windowStart: DateTime,
  windowSize: number,
  timezone?: string
): GetSessionsResponse {
  const windowEnd = windowStart.plus({ minutes: windowSize });

  return sessions.filter(session => sessionOverlapsWindow(session, windowStart, windowEnd, timezone));
}

/**
 * Format a window's start for display in the timeline
 */
export function formatTimelineTime(time: DateTime, windowSize: number): string {
  const clock = hour12 ? "h:mm a" : "HH:mm";
  if (windowSize < 60) {
    // Less than 1 hour: show time
    return time.toFormat(clock);
  } else if (windowSize < 1440) {
    // Less than 1 day: show date and time
    return time.toFormat(`MMM d, ${clock}`);
  } else {
    // 1 day or more: show date only
    return time.toFormat("MMM d");
  }
}
