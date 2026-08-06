import { Filter } from "@rybbit/shared";
import { getFilteredFilters } from "../../../lib/store";
import { USER_PAGE_FILTERS } from "../../../lib/filterGroups";
import { APIResponse } from "../../types";
import { fetchUsers, UsersParams, UsersResponse } from "../endpoints";
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

  return useAnalyticsQuery<
    APIResponse<UsersResponse[]> & {
      totalCount: number;
      page: number;
      pageSize: number;
    },
    UsersParams
  >({
    key: "users",
    // customFilters fall back to the store filters when empty; disable filters
    // entirely instead so an empty page-filter set stays unfiltered.
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
    extraParams: {
      page,
      pageSize,
      sortBy,
      sortOrder: sortOrder as "asc" | "desc",
      identifiedOnly,
      search,
      searchField,
    },
    // Use default staleTime (0) for real-time data
    staleTime: 0,
    // Enable refetching when the window regains focus
    props: { refetchOnWindowFocus: true },
    fetch: async (site, params) => {
      const result = await fetchUsers(site, params);
      return {
        data: result.data as UsersResponse[],
        totalCount: result.totalCount,
        page: result.page,
        pageSize: result.pageSize,
      };
    },
  });
}
