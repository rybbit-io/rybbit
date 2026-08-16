import { Filter } from "@rybbit/shared";
import { USER_PAGE_FILTERS } from "../../../lib/filterGroups";
import { getFilteredFilters } from "../../../lib/store";
import { UsersListResponse } from "../endpoints";
import { useAnalyticsQuery } from "../useAnalyticsQuery";

export interface GetUsersOptions {
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: string;
  filters?: Filter[];
  identifiedOnly?: boolean;
  search?: string;
  searchField?: string;
}

export function useGetUsers(options: GetUsersOptions) {
  const { page, pageSize, sortBy, sortOrder, identifiedOnly = false, search, searchField } = options;
  const filteredFilters = getFilteredFilters(USER_PAGE_FILTERS);

  return useAnalyticsQuery<UsersListResponse>({
    key: "users",
    path: "users",
    unwrap: false,
    // customFilters fall back to the store filters when empty; disable filters
    // entirely instead so an empty page-filter set stays unfiltered.
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
    params: {
      page,
      page_size: pageSize,
      sort_by: sortBy,
      sort_order: sortOrder,
      identified_only: identifiedOnly,
      search: search || undefined,
      search_field: searchField || undefined,
    },
    // Use default staleTime (0) for real-time data
    staleTime: 0,
    // Enable refetching when the window regains focus
    props: { refetchOnWindowFocus: true },
  });
}
