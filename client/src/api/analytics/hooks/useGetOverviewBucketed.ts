import { Filter, TimeBucket } from "@rybbit/shared";
import { UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { Time } from "../../../components/DateSelector/types";
import { GetOverviewBucketedResponse } from "../endpoints";
import { useAnalyticsQuery } from "../useAnalyticsQuery";

type PeriodTime = "current" | "previous";

export function useGetOverviewBucketed({
  periodTime,
  site,
  bucket = "hour",
  dynamicFilters = [],
  refetchInterval,
  overrideTime,
  props,
  useFilters = true,
  lite = false,
}: {
  periodTime?: PeriodTime;
  site: number | string;
  bucket?: TimeBucket;
  dynamicFilters?: Filter[];
  refetchInterval?: number;
  overrideTime?: Time;
  props?: Partial<UseQueryOptions<GetOverviewBucketedResponse, Error>>;
  useFilters?: boolean;
  // Read the MV-backed lite endpoint instead of the raw-events one.
  lite?: boolean;
}): UseQueryResult<GetOverviewBucketedResponse> {
  return useAnalyticsQuery<GetOverviewBucketedResponse>({
    key: "overview-bucketed",
    path: lite ? "overview-bucketed-lite" : "overview/time-series",
    site,
    periodTime,
    overrideTime,
    useFilters,
    additionalFilters: dynamicFilters,
    params: { bucket },
    refetchInterval,
    props,
  });
}
