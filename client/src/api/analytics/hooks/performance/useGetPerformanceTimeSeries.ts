import { Filter, TimeBucket } from "@rybbit/shared";
import { UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { useStore } from "../../../../lib/store";
import { GetPerformanceTimeSeriesResponse } from "../../endpoints";
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
  props?: Partial<UseQueryOptions<GetPerformanceTimeSeriesResponse, Error>>;
}): UseQueryResult<GetPerformanceTimeSeriesResponse> {
  const storeBucket = useStore(state => state.bucket);

  return useAnalyticsQuery<GetPerformanceTimeSeriesResponse>({
    key: "performance-time-series",
    path: "performance/time-series",
    site,
    periodTime,
    additionalFilters: dynamicFilters,
    params: { bucket: bucket || storeBucket },
    staleTime: Infinity,
    props,
  });
}
