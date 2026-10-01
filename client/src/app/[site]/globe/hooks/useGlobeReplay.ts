import { DateTime } from "luxon";
import { useMemo } from "react";
import { GetSessionsResponse } from "../../../../api/analytics/endpoints";
import { useGetOverviewBucketed } from "../../../../api/analytics/hooks/useGetOverviewBucketed";
import { useStore, useTimezone } from "../../../../lib/store";
import { getAbsoluteBounds } from "../../../../lib/time";
import { useGlobeStore } from "../globeStore";
import { useTimelineStore } from "../timelineStore";
import {
  availableWindowSizes,
  bucketForWindow,
  generateTimeWindows,
  getActiveSessions,
  resolveWindowSize,
  sumIntoWindows,
} from "../timelineUtils";
import { useReplaySessions } from "./useReplaySessions";

const NO_SESSIONS: GetSessionsResponse = [];

export interface GlobeReplay {
  /** The period being replayed; null while an all-time period's extent is still loading, or when it has no data. */
  range: { start: DateTime; end: DateTime } | null;
  /** Window size in minutes. */
  windowSize: number;
  windowOptions: { value: number; label: string }[];
  windows: DateTime[];
  /** Sessions started in each window. */
  counts: number[];
  countsLoading: boolean;
  /** Index of the window on the map, or -1 for the whole period. */
  index: number;
  windowStart: DateTime | null;
  /** The period's sessions, once the replay has asked for them. */
  sessions: GetSessionsResponse;
  /** Sessions overlapping the window on the map. Empty for the whole period. */
  activeSessions: GetSessionsResponse;
  sessionsRequested: boolean;
  sessionsLoading: boolean;
  sessionsError: boolean;
  /** True when the period holds more sessions than the replay loads. */
  hasMoreData: boolean;
}

/**
 * Everything the replay bar and the map need to step through the selected
 * period: the windows it is cut into, how busy each was, which one is on the
 * map, and the sessions in it.
 *
 * The windows come from the selected period, not from the sessions, so the bar
 * is drawn (from the cheap time series) before any session is loaded. Call it
 * once per page and pass the result down: "now" is read here to cap a period
 * that is still running.
 */
export function useGlobeReplay(): GlobeReplay {
  const site = useStore(state => state.site);
  const time = useStore(state => state.time);
  const zone = useTimezone();
  const breakdown = useGlobeStore(state => state.breakdown);
  const currentTime = useTimelineStore(state => state.currentTime);
  const manualWindowSize = useTimelineStore(state => state.manualWindowSize);
  const requested = useTimelineStore(state => state.sessionsRequested);

  const isAllTime = time.mode === "all-time";
  // All time has no bounds of its own: its extent is the first and last day with data.
  const extent = useGetOverviewBucketed({ site, bucket: "day", props: { enabled: isAllTime && !!site } });

  const range = useMemo(() => {
    const now = DateTime.now().setZone(zone);
    let bounds = getAbsoluteBounds(time, zone);
    if (!bounds) {
      const days = extent.data?.filter(point => point.sessions > 0) ?? [];
      if (days.length === 0) return null;
      bounds = {
        start: DateTime.fromSQL(days[0].time, { zone }),
        end: DateTime.fromSQL(days[days.length - 1].time, { zone }).plus({ days: 1 }),
      };
    }
    const end = bounds.end > now ? now : bounds.end;
    return bounds.start.isValid && end.isValid && bounds.start < end ? { start: bounds.start, end } : null;
  }, [time, zone, extent.data]);

  const windowSize = range ? resolveWindowSize(range.start, range.end, manualWindowSize) : 60;
  const windowOptions = useMemo(() => (range ? availableWindowSizes(range.start, range.end) : []), [range]);
  const windows = useMemo(
    () => (range ? generateTimeWindows(range.start, range.end, windowSize) : []),
    [range, windowSize]
  );

  const { bucket, minutes: bucketMinutes } = bucketForWindow(windowSize);
  const series = useGetOverviewBucketed({ site, bucket, props: { enabled: !!range && !!site } });
  const counts = useMemo(
    () =>
      range && series.data
        ? sumIntoWindows(series.data, range.start, windowSize, windows.length, bucketMinutes, zone)
        : [],
    [range, series.data, windowSize, windows.length, bucketMinutes, zone]
  );

  // The sessions breakdown draws people, and a whole period of them is not
  // drawable: it always shows one window, starting with the first.
  const needsWindow = breakdown === "sessions";
  let index = -1;
  if (range && windows.length > 0) {
    if (currentTime !== null) {
      const position = Math.floor((currentTime - range.start.toMillis()) / (windowSize * 60_000));
      if (position >= 0 && position < windows.length) index = position;
    }
    if (index === -1 && needsWindow) index = 0;
  }
  const windowStart = index >= 0 ? windows[index] : null;

  const sessionsRequested = requested || needsWindow;
  const { sessions, isLoading, isError, hasMoreData } = useReplaySessions(sessionsRequested);
  const activeSessions = useMemo(
    () =>
      windowStart && sessions.length > 0 ? getActiveSessions(sessions, windowStart, windowSize, zone) : NO_SESSIONS,
    [windowStart, sessions, windowSize, zone]
  );

  return {
    range,
    windowSize,
    windowOptions,
    windows,
    counts,
    countsLoading: series.isLoading || (isAllTime && extent.isLoading),
    index,
    windowStart,
    sessions,
    activeSessions,
    sessionsRequested,
    sessionsLoading: isLoading,
    sessionsError: isError,
    hasMoreData,
  };
}
