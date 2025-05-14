import { useQuery } from "@tanstack/react-query";
import { BACKEND_URL } from "../../lib/const";
import {
  getFilteredFilters,
  GOALS_PAGE_FILTERS,
  useStore,
} from "../../lib/store";
import { authedFetch, getStartAndEndDate } from "../utils";
import { getQueryTimeParams } from "./utils";

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
  minutes,
}: {
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  sort?: "goalId" | "name" | "goalType" | "createdAt";
  order?: "asc" | "desc";
  enabled?: boolean;
  minutes?: number;
}) {
  const { site, time } = useStore();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const filteredFilters = getFilteredFilters(GOALS_PAGE_FILTERS);

  // If startDate and endDate are not provided, use time from store
  let timeParams: Record<string, string> = {};

  if (minutes) {
    // If minutes is explicitly provided, use it
    timeParams = { minutes: minutes.toString(), timezone };
  } else if (!startDate || !endDate) {
    // Otherwise get time parameters from the store's time
    // This will handle last-24-hours mode automatically
    const queryParams = getQueryTimeParams(time);
    timeParams = Object.fromEntries(new URLSearchParams(queryParams));
  } else {
    // Use explicitly provided dates if available
    timeParams = { startDate, endDate, timezone };
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
      return authedFetch(`${BACKEND_URL}/goals/${site}`, {
        ...timeParams,
        filteredFilters,
        page,
        pageSize,
        sort,
        order,
      }).then((res) => res.json());
    },
    enabled: !!site && enabled,
  });
}

/**
 * Hook to get goals data for the past X minutes
 */
export function useGetGoalsPastMinutes({
  minutes = 24 * 60,
  page = 1,
  pageSize = 10,
  sort = "createdAt",
  order = "desc",
  enabled = true,
}: {
  minutes?: number;
  page?: number;
  pageSize?: number;
  sort?: "goalId" | "name" | "goalType" | "createdAt";
  order?: "asc" | "desc";
  enabled?: boolean;
}) {
  return useGetGoals({
    minutes,
    page,
    pageSize,
    sort,
    order,
    enabled,
  });
}
