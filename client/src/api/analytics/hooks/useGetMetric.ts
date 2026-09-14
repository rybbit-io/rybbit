import { Filter, FilterParameter } from "@rybbit/shared";
import { InfiniteData, UseInfiniteQueryResult, UseQueryResult } from "@tanstack/react-query";
import { Time } from "../../../components/DateSelector/types";
import { MetricResponse } from "../endpoints";
import { nextPageByTotalCount, useAnalyticsInfiniteQuery, useAnalyticsQuery } from "../useAnalyticsQuery";

type PeriodTime = "current" | "previous";

type PaginatedResponse = {
  data: MetricResponse[];
  totalCount: number;
};

// Lite endpoints forward filters too — the server falls back to raw events
// when a filter is active. `lite` only selects the endpoint, not the filters.
const metricPath = (lite: boolean) => (lite ? "metric-lite" : "metric");

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
}): UseQueryResult<PaginatedResponse> {
  return useAnalyticsQuery<PaginatedResponse>({
    key: parameter,
    path: metricPath(false),
    periodTime,
    doublePastMinutesForPrevious: true,
    useFilters,
    params: { parameter, limit },
  });
}

export function usePaginatedMetric({
  parameter,
  limit = 10,
  page = 1,
  useFilters = true,
  additionalFilters = [],
  customFilters = [],
  customTime,
  lite = false,
}: {
  parameter: FilterParameter;
  limit?: number;
  page?: number;
  useFilters?: boolean;
  enabled?: boolean;
  additionalFilters?: Filter[];
  customFilters?: Filter[];
  customTime?: Time;
  lite?: boolean;
}): UseQueryResult<PaginatedResponse> {
  return useAnalyticsQuery<PaginatedResponse>({
    key: parameter,
    path: metricPath(lite),
    overrideTime: customTime,
    useFilters,
    additionalFilters,
    customFilters,
    params: { parameter, limit, page },
  });
}

export function useInfiniteMetric({
  parameter,
  limit = 25,
  useFilters = true,
  additionalFilters = [],
  customFilters = [],
  customTime,
  lite = false,
}: {
  parameter: FilterParameter;
  limit?: number;
  useFilters?: boolean;
  additionalFilters?: Filter[];
  customFilters?: Filter[];
  customTime?: Time;
  lite?: boolean;
}): UseInfiniteQueryResult<InfiniteData<PaginatedResponse>> {
  return useAnalyticsInfiniteQuery<PaginatedResponse>({
    key: parameter,
    path: metricPath(lite),
    overrideTime: customTime,
    useFilters,
    additionalFilters,
    customFilters,
    params: { parameter, limit },
    initialPageParam: 1,
    pageParams: page => ({ page }),
    getNextPageParam: nextPageByTotalCount,
  });
}
