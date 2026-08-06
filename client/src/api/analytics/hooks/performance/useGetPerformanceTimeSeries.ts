import { Filter, TimeBucket } from "@rybbit/shared";
import { UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { useStore } from "../../../../lib/store";
import { APIResponse } from "../../../types";
import {
  fetchPerformanceTimeSeries,
  GetPerformanceTimeSeriesResponse,
  PerformanceTimeSeriesParams,
} from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

type PeriodTime = "current" | "previous";

export function useGetPerformanceTimeSeries({
  periodTime,
  site,
  bucket,
  dynamicFilters = [],
  props,
}: {
  periodTime?: PeriodTime;
  site: number | string;
  bucket?: TimeBucket;
  dynamicFilters?: Filter[];
  props?: Partial<UseQueryOptions<APIResponse<GetPerformanceTimeSeriesResponse>>>;
}): UseQueryResult<APIResponse<GetPerformanceTimeSeriesResponse>> {
  const { bucket: storeBucket } = useStore();
  const bucketToUse = bucket || storeBucket;

  return useAnalyticsQuery<APIResponse<GetPerformanceTimeSeriesResponse>, PerformanceTimeSeriesParams>({
    key: "performance-time-series",
    site,
    periodTime,
    additionalFilters: dynamicFilters,
    extraParams: { bucket: bucketToUse },
    staleTime: Infinity,
    props,
    fetch: (site, params) => fetchPerformanceTimeSeries(site, params).then(data => ({ data })),
  });
}
