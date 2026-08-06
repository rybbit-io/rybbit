import { Filter, FilterParameter } from "@rybbit/shared";
import { InfiniteData, UseInfiniteQueryResult, UseQueryResult } from "@tanstack/react-query";
import { Time } from "../../../components/DateSelector/types";
import { APIResponse } from "../../types";
import { fetchMetric, fetchMetricLite, MetricResponse } from "../endpoints";
import { MetricParams } from "../endpoints/types";
import { useAnalyticsQuery, useAnalyticsInfiniteQuery } from "../useAnalyticsQuery";

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
  return useAnalyticsQuery<APIResponse<MetricResponse[]>, MetricParams>({
    key: parameter,
    periodTime,
    doublePastMinutesForPrevious: true,
    useFilters,
    extraParams: { parameter, limit },
    fetch: (site, params) => fetchMetric(site, params).then(result => ({ data: result.data })),
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
  // Lite endpoints forward filters too — the server falls back to raw events
  // when a filter is active. `lite` only selects the fetcher, not the filters.
  return useAnalyticsQuery<PaginatedResponse, MetricParams>({
    key: parameter,
    overrideTime: customTime,
    useFilters,
    additionalFilters,
    customFilters,
    extraParams: { parameter, limit, page },
    keyExtras: [lite],
    fetch: (site, params) => (lite ? fetchMetricLite : fetchMetric)(site, params),
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
  // Lite endpoints forward filters too — the server falls back to raw events
  // when a filter is active. `lite` only selects the fetcher, not the filters.
  return useAnalyticsInfiniteQuery<PaginatedResponse, MetricParams>({
    key: parameter,
    overrideTime: customTime,
    useFilters,
    additionalFilters,
    customFilters,
    extraParams: { parameter, limit },
    keyExtras: [lite],
    fetchPage: (site, params, page) => (lite ? fetchMetricLite : fetchMetric)(site, { ...params, page }),
  });
}
