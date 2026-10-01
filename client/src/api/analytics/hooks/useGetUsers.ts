import { USER_PAGE_FILTERS } from "../../../lib/filterGroups";
import { getFilteredFilters } from "../../../lib/store";
import { UsersListResponse, UsersSummary } from "../endpoints";
import { nextPageByTotalCount, useAnalyticsInfiniteQuery, useAnalyticsQuery } from "../useAnalyticsQuery";

type PeriodTime = "current" | "previous";

/** One group of a trait breakdown: a value of the trait, or the users with no value for it. */
export type TraitGroupSelector = { key: string; value: string } | { key: string; missing: true };

/** Which users the list shows, on top of the period and the page's filters. */
export interface UsersNarrowing {
  identifiedOnly?: boolean;
  /** Only users with no visit in the lookback before the period. */
  newOnly?: boolean;
  /** Only users with at least this many sessions in the period. */
  minSessions?: number;
  search?: string;
  searchField?: string;
  traitGroup?: TraitGroupSelector;
}

export interface GetUsersOptions extends UsersNarrowing {
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: string;
  enabled?: boolean;
}

/**
 * The filter context every Users-page read shares. `customFilters` falls back
 * to the store's filters when empty, so filters are switched off instead when
 * none of the store's apply to this page.
 */
export function useUserPageFilters() {
  const filteredFilters = getFilteredFilters(USER_PAGE_FILTERS);
  return { useFilters: filteredFilters.length > 0, customFilters: filteredFilters };
}

/** The wire params for a narrowing; shared by the list and the trait breakdown so they cannot drift. */
export function narrowingParams(narrowing: UsersNarrowing): Record<string, unknown> {
  const { identifiedOnly, newOnly, minSessions, search, searchField, traitGroup } = narrowing;
  return {
    identified_only: identifiedOnly || undefined,
    new_only: newOnly || undefined,
    min_sessions: minSessions,
    search: search || undefined,
    search_field: search ? searchField || undefined : undefined,
    trait_key: traitGroup?.key,
    trait_value: traitGroup && "value" in traitGroup ? traitGroup.value : undefined,
    trait_missing: traitGroup && "missing" in traitGroup ? true : undefined,
  };
}

export function useGetUsers(options: GetUsersOptions) {
  const { page, pageSize, sortBy, sortOrder, enabled, ...narrowing } = options;

  return useAnalyticsQuery<UsersListResponse>({
    key: "users",
    path: "users",
    unwrap: false,
    ...useUserPageFilters(),
    params: {
      page,
      page_size: pageSize,
      sort_by: sortBy,
      sort_order: sortOrder,
      ...narrowingParams(narrowing),
    },
    // Use default staleTime (0) for real-time data
    staleTime: 0,
    enabled,
    // Enable refetching when the window regains focus
    props: { refetchOnWindowFocus: true },
  });
}

/** The same list, loaded a page at a time: the rows under one trait group. */
export function useGetUsersInfinite(options: Omit<GetUsersOptions, "page">) {
  const { pageSize, sortBy, sortOrder, enabled, ...narrowing } = options;

  return useAnalyticsInfiniteQuery<UsersListResponse>({
    key: ["users", "group"],
    path: "users",
    unwrap: false,
    ...useUserPageFilters(),
    params: {
      page_size: pageSize,
      sort_by: sortBy,
      sort_order: sortOrder,
      ...narrowingParams(narrowing),
    },
    initialPageParam: 1,
    pageParams: page => ({ page }),
    getNextPageParam: nextPageByTotalCount,
    staleTime: 0,
    enabled,
  });
}

/** The stat band's figures for the selected period, or for the one it is compared with. */
export function useGetUsersSummary({ periodTime, enabled }: { periodTime?: PeriodTime; enabled?: boolean } = {}) {
  return useAnalyticsQuery<UsersSummary>({
    // Under the "users" prefix so the mutations that invalidate the list refresh this too.
    key: ["users", "summary"],
    path: "users/summary",
    periodTime,
    ...useUserPageFilters(),
    enabled,
  });
}
