import { DateTime } from "luxon";
import { create } from "zustand";
import { useMemo } from "react";
import type { GetSessionsResponse } from "../../../api/analytics/endpoints";
import { useStore } from "../../../lib/store";
import { getActiveSessions } from "./timelineUtils";

interface TimelineStore {
  currentTime: DateTime | null;
  timeRange: { start: DateTime; end: DateTime } | null;
  windowSize: number; // in minutes
  manualWindowSize: number | null; // User-selected window size, overrides auto-calculated
  allSessions: GetSessionsResponse;
  isLoading: boolean;
  isError: boolean;
  hasMoreData: boolean;
  setCurrentTime: (time: DateTime) => void;
  setTimeRange: (start: DateTime, end: DateTime) => void;
  setWindowSize: (size: number) => void;
  setManualWindowSize: (size: number | null) => void;
  setAllSessions: (sessions: GetSessionsResponse, hasMoreData: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: boolean) => void;
  reset: () => void;
}

export const useTimelineStore = create<TimelineStore>(set => ({
  currentTime: null,
  timeRange: null,
  windowSize: 60,
  manualWindowSize: null,
  allSessions: [],
  isLoading: false,
  isError: false,
  hasMoreData: false,
  setCurrentTime: time => set({ currentTime: time }),
  setTimeRange: (start, end) => set({ timeRange: { start, end }, currentTime: start }),
  setWindowSize: size => set({ windowSize: size }),
  setManualWindowSize: size => set({ manualWindowSize: size, windowSize: size || 60 }),
  setAllSessions: (sessions, hasMoreData) => set({ allSessions: sessions, hasMoreData }),
  setLoading: loading => set({ isLoading: loading }),
  setError: error => set({ isError: error }),
  reset: () =>
    set({
      currentTime: null,
      timeRange: null,
      windowSize: 60,
      manualWindowSize: null,
      allSessions: [],
      isLoading: false,
      isError: false,
      hasMoreData: false,
    }),
}));

// Hook to compute active sessions based on current time and window size
// Uses useMemo to prevent infinite re-renders
export function useActiveSessions(): GetSessionsResponse {
  const currentTime = useTimelineStore(state => state.currentTime);
  const windowSize = useTimelineStore(state => state.windowSize);
  const allSessions = useTimelineStore(state => state.allSessions);
  // Use reactive timezone from useStore
  const storeTimezone = useStore(state => state.timezone);
  const timezone = storeTimezone === "system" ? Intl.DateTimeFormat().resolvedOptions().timeZone : storeTimezone;

  return useMemo(() => {
    if (!currentTime || allSessions.length === 0) return [];
    const activeSessions = getActiveSessions(allSessions, currentTime, windowSize, timezone);
    return activeSessions;
  }, [currentTime, windowSize, allSessions, timezone]);
}
