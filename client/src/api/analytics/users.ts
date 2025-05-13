import { useQuery } from "@tanstack/react-query";
import { BACKEND_URL } from "../../lib/const";
import {
  useStore,
  Filter,
  USER_PAGE_FILTERS,
  getFilteredFilters,
} from "../../lib/store";
import { getStartAndEndDate, authedFetch } from "../utils";
import { APIResponse } from "../types";
import { getQueryTimeParams } from "./utils";

export type UsersResponse = {
  user_id: string;
  country: string;
  region: string;
  city: string;
  language: string;
  browser: string;
  operating_system: string;
  device_type: string;
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
  const isPast24HoursMode = time.mode === "last-24-hours";

  // Get the appropriate time parameters
  const timeParams = isPast24HoursMode
    ? Object.fromEntries(new URLSearchParams(getQueryTimeParams(time)))
    : getStartAndEndDate(time);

  const { page, pageSize, sortBy, sortOrder } = options;
  const filteredFilters = getFilteredFilters(USER_PAGE_FILTERS);

  return useQuery<
    APIResponse<UsersResponse[]> & {
      totalCount: number;
      page: number;
      pageSize: number;
    }
  >({
    queryKey: [
      "users",
      site,
      time,
      page,
      pageSize,
      sortBy,
      sortOrder,
      filteredFilters,
    ],
    queryFn: async () => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Build request parameters
      const requestParams: Record<string, any> = {
        timezone,
        filters: filteredFilters,
        page,
        pageSize,
        sortBy,
        sortOrder,
      };

      // Add time parameters
      if (isPast24HoursMode) {
        // Add minutes parameter for last-24-hours mode
        Object.assign(requestParams, timeParams);
      } else {
        requestParams.startDate = timeParams.startDate;
        requestParams.endDate = timeParams.endDate;
      }

      return authedFetch(`${BACKEND_URL}/users/${site}`, requestParams).then(
        (res) => res.json()
      );
    },
    // Use default staleTime (0) for real-time data
    staleTime: 0,
    // Enable refetching when the window regains focus
    refetchOnWindowFocus: true,
    // Add a background refetch interval (every 30 seconds)
    // refetchInterval: 30000,
  });
}
