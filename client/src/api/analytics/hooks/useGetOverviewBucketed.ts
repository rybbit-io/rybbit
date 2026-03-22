import { Filter, TimeBucket } from "@rybbit/shared";
import { UseQueryOptions, UseQueryResult, useQuery } from "@tanstack/react-query";
import { useStore } from "../../../lib/store";
import { APIResponse } from "../../types";
import { buildApiParams } from "../../utils";
import { fetchOverviewBucketed, GetOverviewBucketedResponse } from "../endpoints";

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
}: {
  periodTime?: PeriodTime;
  site: number | string;
  bucket?: TimeBucket;
  dynamicFilters?: Filter[];
  refetchInterval?: number;
  overrideTime?:
    | { mode: "past-minutes"; pastMinutesStart: number; pastMinutesEnd: number }
    | { mode: "range"; startDate: string; endDate: string };
  props?: Partial<UseQueryOptions<APIResponse<GetOverviewBucketedResponse>>>;
  useFilters?: boolean;
}): UseQueryResult<APIResponse<GetOverviewBucketedResponse>> {
  const { time, previousTime, filters: globalFilters, timezone } = useStore();

  // Use overrideTime if provided, otherwise use store time
  const baseTime = overrideTime || time;
  const timeToUse = periodTime === "previous" ? previousTime : baseTime;
  const combinedFilters = useFilters ? [...globalFilters, ...dynamicFilters] : undefined;

  // Generate appropriate query key based on whether we're using past minutes or regular time
  const queryKey =
    timeToUse.mode === "past-minutes"
      ? [
          "overview-bucketed-past-minutes",
          timeToUse.pastMinutesStart,
          timeToUse.pastMinutesEnd,
          site,
          bucket,
          combinedFilters,
          useFilters,
          timezone,
        ]
      : ["overview-bucketed", timeToUse, bucket, site, combinedFilters, useFilters, timezone];

  const params = buildApiParams(timeToUse, { filters: combinedFilters });

  return useQuery({
    queryKey,
    queryFn: () => {
      return fetchOverviewBucketed(site, { ...params, bucket }).then(data => ({ data }));
    },
    refetchInterval,
    placeholderData: (_, query: any) => {
      if (!query?.queryKey) return undefined;
      const queryKeyArray = query.queryKey as any[];

      // Find site in query key (position varies based on query type)
      const siteIndex = queryKeyArray.findIndex(item => item === site);
      if (siteIndex !== -1) {
        return query.state.data;
      }
      return undefined;
    },
    staleTime: 60_000,
    enabled: !!site,
    ...props,
  });
}
