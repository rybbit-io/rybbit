import { Filter } from "@rybbit/shared";
import { useQuery } from "@tanstack/react-query";
import { getFilteredFilters, useStore } from "../../../lib/store";
import { USER_PAGE_FILTERS } from "../../../lib/filterGroups";
import { APIResponse } from "../../types";
import { buildApiParams } from "../../utils";
import { fetchUsers, UsersResponse } from "../endpoints";

export interface GetUsersOptions {
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: string;
  filters?: Filter[];
  identifiedOnly?: boolean;
}

export function useGetUsers(options: GetUsersOptions) {
  const { time, site, timezone } = useStore();

  const { page, pageSize, sortBy, sortOrder, identifiedOnly = false } = options;
  const filteredFilters = getFilteredFilters(USER_PAGE_FILTERS);
  const params = buildApiParams(time, { filters: filteredFilters });

  return useQuery<
    APIResponse<UsersResponse[]> & {
      totalCount: number;
      page: number;
      pageSize: number;
    }
  >({
    queryKey: ["users", site, time, page, pageSize, sortBy, sortOrder, filteredFilters, identifiedOnly, timezone],
    queryFn: async () => {
      const result = await fetchUsers(site, {
        ...params,
        page,
        pageSize,
        sortBy,
        sortOrder: sortOrder as "asc" | "desc",
        identifiedOnly,
      });
      return {
        data: result.data as UsersResponse[],
        totalCount: result.totalCount,
        page: result.page,
        pageSize: result.pageSize,
      };
    },
    // Use default staleTime (0) for real-time data
    staleTime: 0,
    // Enable refetching when the window regains focus
    refetchOnWindowFocus: true,
    enabled: !!site,
  });
}
