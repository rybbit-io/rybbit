import { useQuery } from "@tanstack/react-query";
import { timeZone } from "../../../lib/dateTimeUtils";
import {
  getFilteredFilters,
  GOALS_PAGE_FILTERS,
  useStore,
} from "../../../lib/store";
import { authedFetch } from "../../utils";
import { getQueryTimeParams } from "../utils";

export interface Goal {
  goalId: number;
  name: string | null;
  goalType: "path" | "event";
  config: {
    pathPattern?: string;
    eventName?: string;
    eventPropertyKey?: string;
    eventPropertyValue?: string | number | boolean;
  };
  createdAt: string;
  total_conversions: number;
  total_sessions: number;
  conversion_rate: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface GoalsResponse {
  data: Goal[];
  meta: PaginationMeta;
}

export function useGetGoals({
  startDate,
  endDate,
  page = 1,
  pageSize = 10,
  sort = "createdAt",
  order = "desc",
  enabled = true,
  pastMinutesStart,
  pastMinutesEnd,
}: {
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  sort?: "goalId" | "name" | "goalType" | "createdAt";
  order?: "asc" | "desc";
  enabled?: boolean;
  pastMinutesStart?: number;
  pastMinutesEnd?: number;
}) {
  const { site, time } = useStore();
  const filteredFilters = getFilteredFilters(GOALS_PAGE_FILTERS);

  // If startDate and endDate are not provided, use time from store
  let timeParams: Record<string, string> = {};

  if (pastMinutesStart !== undefined && pastMinutesEnd !== undefined) {
    // If past minutes range is explicitly provided, use it
    timeParams = {
      pastMinutesStart: pastMinutesStart.toString(),
      pastMinutesEnd: pastMinutesEnd.toString(),
      timeZone,
    };
  } else if (!startDate || !endDate) {
    // Otherwise get time parameters from the store's time
    // This will handle last-24-hours mode automatically
    const queryParams = getQueryTimeParams(time);
    timeParams = Object.fromEntries(new URLSearchParams(queryParams));
  } else {
    // Use explicitly provided dates if available
    timeParams = { startDate, endDate, timeZone };
  }

  return useQuery({
    queryKey: [
      "goals",
      site,
      timeParams,
      filteredFilters,
      page,
      pageSize,
      sort,
      order,
    ],
    queryFn: async () => {
      return authedFetch<GoalsResponse>(`/goals/${site}`, {
        ...timeParams,
        filteredFilters,
        page,
        pageSize,
        sort,
        order,
      });
    },
    enabled: !!site && enabled,
  });
}

/**
 * Hook to get goals data for the past X minutes
 */
export function useGetGoalsPastMinutes({
  pastMinutesStart = 24 * 60,
  pastMinutesEnd = 0,
  page = 1,
  pageSize = 10,
  sort = "createdAt",
  order = "desc",
  enabled = true,
}: {
  pastMinutesStart?: number;
  pastMinutesEnd?: number;
  page?: number;
  pageSize?: number;
  sort?: "goalId" | "name" | "goalType" | "createdAt";
  order?: "asc" | "desc";
  enabled?: boolean;
}) {
  return useGetGoals({
    pastMinutesStart,
    pastMinutesEnd,
    page,
    pageSize,
    sort,
    order,
    enabled,
  });
}
