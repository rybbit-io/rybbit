import { Time } from "../../../components/DateSelector/types";
import { SESSION_PAGE_FILTERS, USER_DETAIL_PAGE_FILTERS } from "../../../lib/filterGroups";
import { getFilteredFilters, useStore } from "../../../lib/store";
import { GetSessionsResponse, SessionPageviewsAndEvents, UserSessionCountResponse } from "../endpoints";
import { useAnalyticsInfiniteQuery, useAnalyticsQuery } from "../useAnalyticsQuery";

export function useGetSessions({
  userId,
  page = 1,
  limit = 100,
  identifiedOnly = false,
  timeOverride,
  minPageviews,
  minEvents,
  minDuration,
}: {
  userId?: string;
  page?: number;
  limit?: number;
  identifiedOnly?: boolean;
  timeOverride?: Time;
  minPageviews?: number;
  minEvents?: number;
  minDuration?: number;
}) {
  const filteredFilters = getFilteredFilters(SESSION_PAGE_FILTERS);

  return useAnalyticsQuery<GetSessionsResponse>({
    key: "sessions",
    path: "sessions",
    overrideTime: timeOverride,
    // customFilters fall back to the store filters when empty; disable filters
    // entirely instead so an empty page-filter set stays unfiltered.
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
    params: {
      page,
      limit,
      user_id: userId,
      identified_only: identifiedOnly,
      min_pageviews: minPageviews,
      min_events: minEvents,
      min_duration: minDuration,
    },
    staleTime: Infinity,
  });
}

export function useGetSessionsInfinite({
  userId,
  timeOverride,
  limit = 100,
  refetchInterval,
}: {
  userId?: string;
  timeOverride?: Time;
  limit?: number;
  refetchInterval?: number;
}) {
  const filteredFilters = getFilteredFilters(SESSION_PAGE_FILTERS);

  return useAnalyticsInfiniteQuery<GetSessionsResponse>({
    key: "sessions-infinite",
    path: "sessions",
    overrideTime: timeOverride,
    // Scoping to a user means every session that user ever had, not just the
    // ones inside the selected period.
    useTime: !userId,
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
    params: { limit, user_id: userId },
    initialPageParam: 1,
    pageParams: page => ({ page }),
    // A full page might have more behind it; a short one is the last.
    getNextPageParam: (lastPage, allPages) => (lastPage.length === limit ? allPages.length + 1 : undefined),
    staleTime: Infinity,
    refetchInterval,
  });
}

export function useGetSessionDetailsInfinite(sessionId: string | null) {
  const time = useStore(state => state.time);
  // In past-minutes mode the session detail endpoint takes the window as a
  // minute count rather than a date range.
  const minutes = time.mode === "past-minutes" ? time.pastMinutesStart : undefined;

  return useAnalyticsInfiniteQuery<SessionPageviewsAndEvents>({
    key: ["session-details-infinite", sessionId],
    path: `sessions/${sessionId}`,
    useTime: false,
    useFilters: false,
    params: { limit: 100, minutes },
    initialPageParam: 0,
    pageParams: offset => ({ offset }),
    getNextPageParam: lastPage =>
      lastPage?.pagination?.hasMore ? lastPage.pagination.offset + lastPage.pagination.limit : undefined,
    enabled: !!sessionId,
    staleTime: Infinity,
  });
}

export function useGetUserSessionCount(userId: string) {
  // The calendar always spans the user's full history, so it only takes the
  // dimension filters, not the selected time range.
  const filteredFilters = getFilteredFilters(USER_DETAIL_PAGE_FILTERS);

  return useAnalyticsQuery<UserSessionCountResponse[]>({
    key: ["user-session-count", userId],
    path: "users/session-count",
    useTime: false,
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
    params: { user_id: userId },
    staleTime: Infinity,
    // Keyed by user: never show the previous user's session calendar.
    placeholder: false,
    enabled: !!userId,
  });
}
