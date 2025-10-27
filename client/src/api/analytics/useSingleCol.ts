import { Filter, FilterParameter } from "@rybbit/shared";
import {
  InfiniteData,
  useInfiniteQuery,
  UseInfiniteQueryResult,
  useQuery,
  UseQueryResult,
} from "@tanstack/react-query";
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
  bounce_rate?: number;
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

  // For "previous" periods in past-minutes mode, we need to modify the time object
  // to use doubled duration for the start and the original start as the end
  const timeForQuery =
    timeToUse.mode === "past-minutes" && periodTime === "previous"
      ? {
          ...timeToUse,
          pastMinutesStart: timeToUse.pastMinutesStart * 2,
          pastMinutesEnd: timeToUse.pastMinutesStart,
        }
      : timeToUse;

  const queryParams = getQueryParams(timeForQuery, {
    parameter,
    limit,
    filters: useFilters ? filters : undefined,
  });

  const queryKey = [parameter, timeForQuery, site, filters, limit, useFilters];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await authedFetch<{
        data: APIResponse<SingleColResponse[]>;
      }>(`/single-col/${site}`, queryParams);
      return response.data;
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
  });
}

type PaginatedResponse = {
  data: SingleColResponse[];
  totalCount: number;
};

export function usePaginatedSingleCol({
  parameter,
  limit = 10,
  page = 1,
  useFilters = true,
  enabled = true,
  additionalFilters = [],
}: {
  parameter: FilterParameter;
  limit?: number;
  page?: number;
  useFilters?: boolean;
  enabled?: boolean;
  additionalFilters?: Filter[];
}): UseQueryResult<PaginatedResponse> {
  const { time, site, filters } = useStore();

  const queryParams = {
    ...getQueryParams(time),
    parameter,
    limit,
    page,
    filters: useFilters ? [...filters, ...additionalFilters] : undefined,
  };

  return useQuery({
    queryKey: [parameter, time, site, filters, limit, page, additionalFilters],
    queryFn: async () => {
      const response = await authedFetch<{ data: PaginatedResponse }>(`/single-col/${site}`, queryParams);
      return response.data;
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
    enabled,
  });
}

export function useInfiniteSingleCol({
  parameter,
  limit = 25,
  useFilters = true,
}: {
  parameter: FilterParameter;
  limit?: number;
  useFilters?: boolean;
}): UseInfiniteQueryResult<InfiniteData<PaginatedResponse>> {
  const { time, site, filters } = useStore();

  return useInfiniteQuery({
    queryKey: [parameter, time, site, filters, limit, "infinite-single-col"],
    queryFn: async ({ pageParam = 1 }) => {
      const queryParams = {
        ...getQueryParams(time),
        parameter,
        limit,
        page: pageParam,
        filters: useFilters ? filters : undefined,
      };

      const response = await authedFetch<{
        data: PaginatedResponse;
      }>(`/single-col/${site}`, queryParams);
      return response.data;
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
  });
}
