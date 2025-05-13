import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { FilterParameter, useStore } from "../../lib/store";
import { APIResponse } from "../types";
import { BACKEND_URL } from "../../lib/const";
import { getStartAndEndDate, authedFetch } from "../utils";

type PeriodTime = "current" | "previous";

export type SingleColResponse = {
  value: string;
  count: number;
  percentage: number;
  pageviews?: number;
  pageviews_percentage?: number;
  time_on_page_seconds?: number;
};

export function useSingleCol({
  parameter,
  limit = 1000,
  periodTime,
  useFilters = true,
}: {
  parameter: FilterParameter;
  limit?: number;
  periodTime?: PeriodTime;
  useFilters?: boolean;
}): UseQueryResult<APIResponse<SingleColResponse[]>> {
  const { time, previousTime, site, filters } = useStore();
  const timeToUse = periodTime === "previous" ? previousTime : time;

  // Check if we're using last-24-hours mode
  const isPast24HoursMode = timeToUse.mode === "last-24-hours";

  // Determine the query parameters based on mode
  const queryParams = isPast24HoursMode
    ? {
        // Past minutes approach
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        parameter,
        limit,
        minutes: periodTime === "previous" ? 48 * 60 : 24 * 60,
        filters: useFilters ? filters : undefined,
      }
    : {
        // Regular date-based approach
        ...getStartAndEndDate(timeToUse),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        parameter,
        limit,
        filters: useFilters ? filters : undefined,
      };

  // Use a consistent query key format that includes the mode
  const queryKey = [
    parameter,
    timeToUse,
    site,
    filters,
    limit,
    useFilters,
    isPast24HoursMode ? "past-minutes" : "date-range",
  ];

  return useQuery({
    queryKey,
    queryFn: () => {
      return authedFetch(`${BACKEND_URL}/single-col/${site}`, queryParams).then(
        (res) => res.json()
      );
    },
    staleTime: Infinity,
    placeholderData: (_, query: any) => {
      if (!query?.queryKey) return undefined;
      const prevQueryKey = query.queryKey as [string, string, string];
      const [, , prevSite] = prevQueryKey;

      if (prevSite === site) {
        return query.state.data;
      }
      return undefined;
    },
  });
}

export function useSingleColRealtime({
  parameter,
  limit = 1000,
  minutes = 30,
}: {
  parameter: FilterParameter;
  limit?: number;
  minutes?: number;
}): UseQueryResult<APIResponse<SingleColResponse[]>> {
  const { site } = useStore();

  return useQuery({
    queryKey: [parameter, site, limit, minutes, "realtime"],
    queryFn: () => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return authedFetch(`${BACKEND_URL}/single-col/${site}`, {
        timezone,
        parameter,
        limit,
        minutes,
      }).then((res) => res.json());
    },
    staleTime: Infinity,
    placeholderData: (_, query: any) => {
      if (!query?.queryKey) return undefined;
      const prevQueryKey = query.queryKey as [string, string, string];
      const [, , prevSite] = prevQueryKey;

      if (prevSite === site) {
        return query.state.data;
      }
      return undefined;
    },
  });
}
