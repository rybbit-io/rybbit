import { Filter } from "@rybbit/shared";
import { useQuery } from "@tanstack/react-query";
import { timeZone } from "../../lib/dateTimeUtils";
import { getFilteredFilters, useStore } from "../../lib/store";
import { USER_PAGE_FILTERS } from "../../lib/filterGroups";
import { APIResponse } from "../types";
import { authedFetch, getQueryParams } from "../utils";

export type UsersResponse = {
  user_id: string;
  country: string;
  region: string;
  city: string;
  language: string;
  browser: string;
  operating_system: string;
  device_type: string;
  referrer: string;
  channel: string;
  pageviews: number;
  events: number;
  sessions: number;
  last_seen: string;
  first_seen: string;
};

export interface GetUsersOptions {
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: string;
  filters?: Filter[];
}

export function useGetUsers(options: GetUsersOptions) {
  const { time, site } = useStore();
  // Get the appropriate time parameters using getQueryParams
  const timeParams = getQueryParams(time);

  const { page, pageSize, sortBy, sortOrder } = options;
  const filteredFilters = getFilteredFilters(USER_PAGE_FILTERS);

  return useQuery<
    APIResponse<UsersResponse[]> & {
      totalCount: number;
      page: number;
      pageSize: number;
    }
  >({
    queryKey: ["users", site, time, page, pageSize, sortBy, sortOrder, filteredFilters],
    queryFn: async () => {
      // Build request parameters
      const requestParams: Record<string, any> = {
        time_zone: timeZone,
        filters: filteredFilters,
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      // Add time parameters (getQueryParams handles both past-minutes and regular modes)
      Object.assign(requestParams, timeParams);

      return authedFetch<
        APIResponse<UsersResponse[]> & {
          totalCount: number;
          page: number;
          pageSize: number;
        }
      >(`/users/${site}`, requestParams);
    },
    // Use default staleTime (0) for real-time data
    staleTime: 0,
    // Enable refetching when the window regains focus
    refetchOnWindowFocus: true,
    // Add a background refetch interval (every 30 seconds)
    // refetchInterval: 30000,
  });
}
