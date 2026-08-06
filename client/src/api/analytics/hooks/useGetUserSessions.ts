import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { SESSION_PAGE_FILTERS, USER_DETAIL_PAGE_FILTERS } from "../../../lib/filterGroups";
import { getFilteredFilters, getTimezone, useStore } from "../../../lib/store";
import { buildApiParams } from "../../utils";
import {
  fetchSession,
  fetchSessions,
  fetchUserSessionCount,
  GetSessionsResponse,
  SessionPageviewsAndEvents,
  SessionsParams,
  UserSessionCountResponse,
} from "../endpoints";
import { Time } from "../../../components/DateSelector/types";
import { useAnalyticsQuery } from "../useAnalyticsQuery";

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

  return useAnalyticsQuery<{ data: GetSessionsResponse }, SessionsParams>({
    key: "sessions",
    overrideTime: timeOverride,
    // customFilters fall back to the store filters when empty; disable filters
    // entirely instead so an empty page-filter set stays unfiltered.
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
    extraParams: { page, limit, userId, identifiedOnly, minPageviews, minEvents, minDuration },
    staleTime: Infinity,
    fetch: (site, params) => fetchSessions(site, params),
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
  const { time, site, timezone } = useStore();

  const filteredFilters = getFilteredFilters(SESSION_PAGE_FILTERS);

  // When filtering by userId, we fetch all sessions for that user (no time filter)
  // Otherwise use buildApiParams which handles past-minutes mode
  const params = userId
    ? { startDate: "", endDate: "", timeZone: getTimezone(), filters: filteredFilters }
    : buildApiParams(timeOverride || time, { filters: filteredFilters });

  return useInfiniteQuery<{ data: GetSessionsResponse }>({
    queryKey: ["sessions-infinite", timeOverride || time, site, filteredFilters, userId, timezone],
    queryFn: ({ pageParam = 1 }) => {
      return fetchSessions(site, {
        ...params,
        page: pageParam as number,
        userId,
        limit,
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: { data: GetSessionsResponse }, allPages) => {
      // If we have data and it's a full page (100 items), there might be more
      if (lastPage?.data && lastPage.data.length === limit) {
        return allPages.length + 1;
      }
      return undefined;
    },
    staleTime: Infinity,
    refetchInterval,
    // Without this the hook fires while the store's site is still empty, requesting
    // /api/sites//sessions (400). LiveUserCount renders on every [site] page, so
    // this ran on every page load.
    enabled: !!site,
  });
}

export function useGetSessionDetailsInfinite(sessionId: string | null) {
  const { site, time } = useStore();
  const pastMinutesMode = time.mode === "past-minutes";

  // Get minutes based on the time mode
  let minutes: number | undefined;
  if (pastMinutesMode && time.mode === "past-minutes") {
    minutes = time.pastMinutesStart;
  }

  return useInfiniteQuery<{ data: SessionPageviewsAndEvents }>({
    queryKey: ["session-details-infinite", sessionId, site, minutes],
    queryFn: ({ pageParam = 0 }) => {
      if (!sessionId) throw new Error("Session ID is required");

      return fetchSession(site, {
        sessionId,
        limit: 100,
        offset: pageParam as number,
        minutes: pastMinutesMode ? minutes : undefined,
      });
    },
    initialPageParam: 0,
    getNextPageParam: lastPage => {
      if (lastPage?.data?.pagination?.hasMore) {
        return lastPage.data.pagination.offset + lastPage.data.pagination.limit;
      }
      return undefined;
    },
    enabled: !!sessionId && !!site,
    staleTime: Infinity,
  });
}

export function useGetUserSessionCount(userId: string) {
  const { site, timezone } = useStore();
  // The calendar always spans the user's full history, so it only takes the
  // dimension filters, not the selected time range.
  const filteredFilters = getFilteredFilters(USER_DETAIL_PAGE_FILTERS);

  return useQuery<{ data: UserSessionCountResponse[] }>({
    queryKey: ["user-session-count", userId, site, timezone, filteredFilters],
    queryFn: () => {
      return fetchUserSessionCount(site, {
        userId,
        timeZone: getTimezone(),
        filters: filteredFilters,
      });
    },
    staleTime: Infinity,
    enabled: !!site && !!userId,
  });
}
