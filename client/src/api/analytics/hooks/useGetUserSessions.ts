import { Time } from "../../../components/DateSelector/types";
import { SESSION_PAGE_FILTERS, USER_DETAIL_PAGE_FILTERS } from "../../../lib/filterGroups";
import { getFilteredFilters, useStore } from "../../../lib/store";
import {
  GetSessionsResponse,
  SessionPageviewsAndEvents,
  SessionSort,
  SessionView,
  UserSessionCountResponse,
} from "../endpoints";
import { useAnalyticsInfiniteQuery, useAnalyticsQuery } from "../useAnalyticsQuery";

export function useGetSessions({
  userId,
  page = 1,
  limit = 100,
  identifiedOnly = false,
  timeOverride,
  minPageviews,
  maxPageviews,
  minEvents,
  maxEvents,
  minDuration,
  maxDuration,
  view,
  sortBy,
  sortOrder,
  includeGoals,
}: {
  userId?: string;
  page?: number;
  limit?: number;
  identifiedOnly?: boolean;
  timeOverride?: Time;
  minPageviews?: number;
  maxPageviews?: number;
  minEvents?: number;
  maxEvents?: number;
  minDuration?: number;
  maxDuration?: number;
  view?: SessionView;
  sortBy?: SessionSort;
  sortOrder?: "asc" | "desc";
  // Ask for each session's completed goals (`converted_goals`).
  includeGoals?: boolean;
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
      max_pageviews: maxPageviews,
      min_events: minEvents,
      max_events: maxEvents,
      min_duration: minDuration,
      max_duration: maxDuration,
      view,
      sort_by: sortBy,
      sort_order: sortOrder,
      include_goals: includeGoals || undefined,
    },
    staleTime: Infinity,
  });
}

export function useGetSessionsInfinite({
  userId,
  timeOverride,
  limit = 100,
  refetchInterval,
  staleTime = Infinity,
  abortable,
}: {
  userId?: string;
  timeOverride?: Time;
  limit?: number;
  refetchInterval?: number;
  staleTime?: number;
  abortable?: boolean;
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
    staleTime,
    refetchInterval,
    abortable,
  });
}

export const LIVE_SESSIONS_POLL_MS = 10_000;

/**
 * The past-5-minute sessions list behind LiveUserCount, polled every 10 s. Its observers are mounted
 * only while someone needs the list, so unmounting the last one cancels a refetch mid-pages.
 */
export function useGetLiveSessions(staleTime: number) {
  return useGetSessionsInfinite({
    timeOverride: { mode: "past-minutes", pastMinutesStart: 5, pastMinutesEnd: 0 },
    limit: 25,
    refetchInterval: LIVE_SESSIONS_POLL_MS,
    staleTime,
    abortable: true,
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
