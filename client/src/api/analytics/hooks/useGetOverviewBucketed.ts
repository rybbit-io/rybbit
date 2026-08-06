import { Filter, TimeBucket } from "@rybbit/shared";
import { UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { Time } from "../../../components/DateSelector/types";
import { APIResponse } from "../../types";
import { fetchOverviewBucketed, fetchOverviewBucketedLite, GetOverviewBucketedResponse } from "../endpoints";
import { BucketedParams } from "../endpoints/types";
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
  props?: Partial<UseQueryOptions<APIResponse<GetOverviewBucketedResponse>, Error>>;
  useFilters?: boolean;
  // Read the MV-backed lite endpoint instead of the raw-events one.
  lite?: boolean;
}): UseQueryResult<APIResponse<GetOverviewBucketedResponse>> {
  return useAnalyticsQuery<APIResponse<GetOverviewBucketedResponse>, BucketedParams>({
    key: "overview-bucketed",
    site,
    periodTime,
    overrideTime,
    useFilters,
    additionalFilters: dynamicFilters,
    extraParams: { bucket },
    keyExtras: [lite],
    refetchInterval,
    props,
    fetch: (site, params) => (lite ? fetchOverviewBucketedLite : fetchOverviewBucketed)(site, params).then(data => ({ data })),
  });
}
