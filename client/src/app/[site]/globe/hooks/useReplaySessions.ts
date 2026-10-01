import { useQuery } from "@tanstack/react-query";
import { buildAnalyticsRequest, fetchAnalytics } from "../../../../api/analytics/analyticsRequest";
import { GetSessionsResponse } from "../../../../api/analytics/endpoints";
import { useAnalyticsContext } from "../../../../api/analytics/useAnalyticsQuery";
import { SESSION_PAGE_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters } from "../../../../lib/store";

export const REPLAY_PAGE_SIZE = 10000;
export const REPLAY_MAX_PAGES = 10;
/** The most sessions a replay loads; beyond it the bar says the replay is partial. */
export const REPLAY_MAX_SESSIONS = REPLAY_PAGE_SIZE * REPLAY_MAX_PAGES;

const NO_SESSIONS: GetSessionsResponse = [];

/**
 * The period's sessions, for replaying them window by window on the map.
 *
 * This is the page's one heavy read: up to 10 pages of 10,000 sessions, fetched
 * one after another (the list endpoint reports no total, so the next page is
 * only known to exist once the last one comes back full). It therefore waits
 * for `enabled`, which the page sets when the user first plays, scrubs or
 * switches to the sessions breakdown.
 */
export function useReplaySessions(enabled: boolean) {
  const filteredFilters = getFilteredFilters(SESSION_PAGE_FILTERS);
  const { site, context } = useAnalyticsContext({
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
  });
  const request = buildAnalyticsRequest({ path: "sessions", params: { limit: REPLAY_PAGE_SIZE } }, context);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["timeline-sessions", site, request.path, request.params],
    queryFn: async () => {
      const sessions: GetSessionsResponse = [];
      let hasMoreData = false;

      for (let page = 1; page <= REPLAY_MAX_PAGES; page++) {
        const batch = await fetchAnalytics<GetSessionsResponse>(site, {
          ...request,
          params: { ...request.params, page },
        });

        if (!batch?.length) break;
        sessions.push(...batch);

        // A short page is the last one; a full page on the last allowed page
        // means there is more data than the replay will load.
        if (batch.length < REPLAY_PAGE_SIZE) break;
        if (page === REPLAY_MAX_PAGES) hasMoreData = true;
      }

      return { sessions, hasMoreData };
    },
    enabled: enabled && !!site,
    staleTime: Infinity,
  });

  return {
    sessions: data?.sessions ?? NO_SESSIONS,
    hasMoreData: data?.hasMoreData ?? false,
    isLoading: enabled && isLoading,
    isError,
  };
}
