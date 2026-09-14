import { useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { useEffect, useMemo } from "react";
import { buildAnalyticsRequest, fetchAnalytics } from "../../../../../../api/analytics/analyticsRequest";
import { GetSessionsResponse } from "../../../../../../api/analytics/endpoints";
import { useAnalyticsContext } from "../../../../../../api/analytics/useAnalyticsQuery";
import { getFilteredFilters } from "../../../../../../lib/store";
import { SESSION_PAGE_FILTERS } from "../../../../../../lib/filterGroups";
import { useShallow } from "zustand/react/shallow";
import { useTimelineStore } from "../../../timelineStore";
import { calculateWindowSize } from "../../../timelineUtils";
import { MAX_PAGES, PAGE_SIZE } from "./timelineLayerConstants";

export function useTimelineSessions() {
  const { manualWindowSize, setTimeRange, setWindowSize, setAllSessions, setLoading, setError } = useTimelineStore(
    useShallow(s => ({
      manualWindowSize: s.manualWindowSize,
      setTimeRange: s.setTimeRange,
      setWindowSize: s.setWindowSize,
      setAllSessions: s.setAllSessions,
      setLoading: s.setLoading,
      setError: s.setError,
    }))
  );
  const filteredFilters = getFilteredFilters(SESSION_PAGE_FILTERS);
  const { site, context } = useAnalyticsContext({
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
  });
  const timezone = context.timeZone;
  const request = buildAnalyticsRequest({ path: "sessions", params: { limit: PAGE_SIZE } }, context);

  // Fetch all sessions with pagination (up to 5 pages, 50k sessions total)
  const { data, isLoading, isError } = useQuery({
    queryKey: ["timeline-sessions", site, request.path, request.params],
    queryFn: async () => {
      const allSessions: GetSessionsResponse = [];
      let reachedMaxPages = false;

      for (let page = 1; page <= MAX_PAGES; page++) {
        const sessions = await fetchAnalytics<GetSessionsResponse>(site, {
          ...request,
          params: { ...request.params, page },
        });

        if (!sessions?.length) break;
        allSessions.push(...sessions);

        // A short page is the last one; a full page on the last allowed page
        // means there is more data than the timeline will load.
        if (sessions.length < PAGE_SIZE) break;
        if (page === MAX_PAGES) reachedMaxPages = true;
      }

      return { data: allSessions, hasMoreData: reachedMaxPages };
    },
    enabled: !!site,
    staleTime: Infinity,
  });

  const allSessions = useMemo(() => {
    if (!data?.data) return [];
    return data.data;
  }, [data]);

  // Update store with loading/error state
  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading, setLoading]);

  useEffect(() => {
    setError(isError);
  }, [isError, setError]);

  // Update store with allSessions
  useEffect(() => {
    if (allSessions.length > 0) {
      setAllSessions(allSessions, data?.hasMoreData || false);
    }
  }, [allSessions, data?.hasMoreData, setAllSessions]);

  // Calculate time range from fetched sessions and initialize timeline
  useEffect(() => {
    if (allSessions.length === 0) return;

    // Find the earliest and latest session times
    let earliest: DateTime | null = null;
    let latest: DateTime | null = null;

    allSessions.forEach(session => {
      const start = DateTime.fromSQL(session.session_start, { zone: "utc" }).setZone(timezone);
      const end = DateTime.fromSQL(session.session_end, { zone: "utc" }).setZone(timezone);

      if (!earliest || start < earliest) {
        earliest = start;
      }
      if (!latest || end > latest) {
        latest = end;
      }
    });

    if (earliest && latest) {
      // Only auto-calculate window size if user hasn't manually set it
      if (manualWindowSize === null) {
        const calculatedWindowSize = calculateWindowSize(earliest, latest);
        setWindowSize(calculatedWindowSize);
      }
      setTimeRange(earliest, latest);
    }
  }, [allSessions, setTimeRange, setWindowSize, manualWindowSize, timezone]);
}
