import { DateTime } from "luxon";
import { GetSessionsResponse } from "../../../api/analytics/userSessions";

/**
 * Calculate the appropriate window size in minutes based on the total time range
 */
export function calculateWindowSize(startTime: DateTime, endTime: DateTime): number {
  const diffInMinutes = endTime.diff(startTime, "minutes").minutes;

  if (diffInMinutes <= 4320) {
    // 3 days or less: 3 hour windows
    return 60;
  } else if (diffInMinutes <= 10080) {
    // 1 week or less: 3 hour windows
    return 180;
  } else if (diffInMinutes <= 43200) {
    // 30 days or less: 6 hour windows
    return 360;
  } else {
    // More than 30 days: 1 day windows
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
];

/**
 * Generate time windows for the timeline scrubber
 */
export function generateTimeWindows(startTime: DateTime, endTime: DateTime, windowSize: number): DateTime[] {
  const windows: DateTime[] = [];
  let currentTime = startTime;

  while (currentTime <= endTime) {
    windows.push(currentTime);
    currentTime = currentTime.plus({ minutes: windowSize });
  }

  return windows;
}

/**
 * Check if a session overlaps with a given time window
 */
export function sessionOverlapsWindow(
  session: GetSessionsResponse[number],
  windowStart: DateTime,
  windowEnd: DateTime
): boolean {
  const sessionStart = DateTime.fromSQL(session.session_start, { zone: "utc" }).toLocal();
  const sessionEnd = DateTime.fromSQL(session.session_end, { zone: "utc" }).toLocal();

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
  windowSize: number
): GetSessionsResponse {
  const windowEnd = windowStart.plus({ minutes: windowSize });

  return sessions.filter(session => sessionOverlapsWindow(session, windowStart, windowEnd));
}

/**
 * Optimized function to count sessions per time window
 * Uses sweep-line algorithm with binary search for O(W log N) complexity
 */
export function getSessionCountsPerWindow(
  sessions: GetSessionsResponse,
  timeWindows: DateTime[],
  windowSize: number
): number[] {
  // Parse all session times once upfront and convert to epoch ms
  const startTimes: number[] = [];
  const endTimes: number[] = [];

  for (const session of sessions) {
    const start = DateTime.fromSQL(session.session_start, { zone: "utc" }).toLocal();
    const end = DateTime.fromSQL(session.session_end, { zone: "utc" }).toLocal();
    startTimes.push(start.toMillis());
    endTimes.push(end.toMillis());
  }

  // Sort both arrays independently
  startTimes.sort((a, b) => a - b);
  endTimes.sort((a, b) => a - b);

  // Binary search to find first index where value >= target
  const findFirstGTE = (arr: number[], target: number): number => {
    let left = 0;
    let right = arr.length;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (arr[mid] < target) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    return left;
  };

  // Binary search to find first index where value > target
  const findFirstGT = (arr: number[], target: number): number => {
    let left = 0;
    let right = arr.length;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (arr[mid] <= target) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    return left;
  };

  // Count sessions for each window using sweep-line
  return timeWindows.map(windowStart => {
    const windowEnd = windowStart.plus({ minutes: windowSize });
    const windowStartMs = windowStart.toMillis();
    const windowEndMs = windowEnd.toMillis();

    // Count = (sessions that started before window end) - (sessions that ended at or before window start)
    const startsBeforeEnd = findFirstGTE(startTimes, windowEndMs);
    const endsBeforeOrAtStart = findFirstGT(endTimes, windowStartMs);

    return startsBeforeEnd - endsBeforeOrAtStart;
  });
}

/**
 * Format time for display in the timeline
 */
export function formatTimelineTime(time: DateTime, windowSize: number): string {
  if (windowSize < 60) {
    // Less than 1 hour: show time
    return time.toFormat("HH:mm");
  } else if (windowSize < 1440) {
    // Less than 1 day: show date and time
    return time.toFormat("MMM d, HH:mm");
  } else {
    // 1 day or more: show date only
    return time.toFormat("MMM d");
  }
}
