import { FilterParameter } from "@rybbit/shared";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { useStore } from "../../lib/store";
import { APIResponse } from "../types";
import { authedFetch, getQueryParams } from "../utils";

type PeriodTime = "current" | "previous";

export type SingleColResponse = {
  value: string;
  title?: string;
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

  const queryParams = getQueryParams(
    timeToUse,
    {
      parameter,
      limit,
      filters: useFilters ? filters : undefined,
    },
    {
      pastMinutesStart: periodTime === "previous" ? 48 * 60 : 24 * 60,
      pastMinutesEnd: periodTime === "previous" ? 24 * 60 : 0,
    }
  );

  // Use a consistent query key format that includes the mode
  const queryKey = [
    parameter,
    timeToUse,
    site,
    filters,
    limit,
    useFilters,
    timeToUse.mode === "last-24-hours" ? "past-minutes" : "date-range",
  ];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await authedFetch<{
        data: APIResponse<SingleColResponse[]>;
      }>(`/single-col/${site}`, queryParams);
      return response.data;
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
