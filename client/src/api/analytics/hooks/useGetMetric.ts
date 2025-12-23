import { Filter, FilterParameter } from "@rybbit/shared";
import {
  InfiniteData,
  useInfiniteQuery,
  UseInfiniteQueryResult,
  useQuery,
  UseQueryResult,
} from "@tanstack/react-query";
import { useStore } from "../../../lib/store";
import { APIResponse } from "../../types";
import { buildApiParams } from "../../utils";
import { Time } from "../../../components/DateSelector/types";
import { fetchMetric, MetricResponse } from "../endpoints";

type PeriodTime = "current" | "previous";

export function useMetric({
  parameter,
  limit = 1000,
  periodTime,
  useFilters = true,
}: {
  parameter: FilterParameter;
  limit?: number;
  periodTime?: PeriodTime;
  useFilters?: boolean;
}): UseQueryResult<APIResponse<MetricResponse[]>> {
  const { time, previousTime, site, filters, timezone } = useStore();
  const timeToUse = periodTime === "previous" ? previousTime : time;

  // For "previous" periods in past-minutes mode, we need to modify the time object
  // to use doubled duration for the start and the original start as the end
  const timeForQuery: Time =
    timeToUse.mode === "past-minutes" && periodTime === "previous"
      ? {
          ...timeToUse,
          pastMinutesStart: timeToUse.pastMinutesStart * 2,
          pastMinutesEnd: timeToUse.pastMinutesStart,
        }
      : timeToUse;

  const params = buildApiParams(timeForQuery, { filters: useFilters ? filters : undefined });
  const queryKey = [parameter, timeForQuery, site, filters, limit, useFilters, timezone];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const result = await fetchMetric(site, {
        ...params,
        parameter,
        limit,
      });
      return { data: result.data };
    },
    staleTime: 60_000,
    placeholderData: (_, query: any) => {
      if (!query?.queryKey) return undefined;
      const prevQueryKey = query.queryKey as [string, string, string];
      const [, , prevSite] = prevQueryKey;

      if (prevSite === site) {
        return query.state.data;
      }
      return undefined;
    },
    enabled: !!site,
  });
}

type PaginatedResponse = {
  data: MetricResponse[];
  totalCount: number;
};

export function usePaginatedMetric({
  parameter,
  limit = 10,
  page = 1,
  useFilters = true,
  additionalFilters = [],
  customFilters = [],
  customTime,
}: {
  parameter: FilterParameter;
  limit?: number;
  page?: number;
  useFilters?: boolean;
  enabled?: boolean;
  additionalFilters?: Filter[];
  customFilters?: Filter[];
  customTime?: Time;
}): UseQueryResult<PaginatedResponse> {
  const { time, site, filters, timezone } = useStore();
  const timeToUse = customTime ?? time;
  const combinedFilters = useFilters
    ? customFilters.length > 0
      ? customFilters
      : [...filters, ...additionalFilters]
    : undefined;

  const params = buildApiParams(timeToUse, { filters: combinedFilters });

  return useQuery({
    queryKey: [parameter, customTime, time, site, filters, limit, page, additionalFilters, customFilters, timezone],
    queryFn: async () => {
      return fetchMetric(site, {
        ...params,
        parameter,
        limit,
        page,
      });
    },
    staleTime: 60_000,
    placeholderData: (_, query: any) => {
      if (!query?.queryKey) return undefined;
      const prevQueryKey = query.queryKey;
      const [, , prevSite] = prevQueryKey;

      if (prevSite === site) {
        return query.state.data;
      }
      return undefined;
    },
    enabled: !!site,
  });
}

export function useInfiniteMetric({
  parameter,
  limit = 25,
  useFilters = true,
}: {
  parameter: FilterParameter;
  limit?: number;
  useFilters?: boolean;
}): UseInfiniteQueryResult<InfiniteData<PaginatedResponse>> {
  const { time, site, filters, timezone } = useStore();
  const params = buildApiParams(time, { filters: useFilters ? filters : undefined });

  return useInfiniteQuery({
    queryKey: [parameter, time, site, filters, limit, "infinite-metric", timezone],
    queryFn: async ({ pageParam = 1 }) => {
      return fetchMetric(site, {
        ...params,
        parameter,
        limit,
        page: pageParam,
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      // If we've fetched all items, don't get next page
      const totalItems = lastPage.totalCount;
      const fetchedItemCount = allPages.reduce((acc, page) => acc + page.data.length, 0);

      if (fetchedItemCount >= totalItems) {
        return undefined;
      }

      return allPages.length + 1;
    },
    staleTime: 60_000,
    enabled: !!site,
  });
}
