import { Filter, TimeBucket } from "@rybbit/shared";
import { useQuery, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { usePerformanceStore } from "../../../../app/[site]/performance/performanceStore";
import { useStore } from "../../../../lib/store";
import { APIResponse } from "../../../types";
import { buildApiParams } from "../../../utils";
import { fetchPerformanceTimeSeries, GetPerformanceTimeSeriesResponse } from "../../endpoints";

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
  const { time, previousTime, filters: globalFilters, bucket: storeBucket, timezone } = useStore();
  const { selectedPerformanceMetric } = usePerformanceStore();

  const timeToUse = periodTime === "previous" ? previousTime : time;
  const bucketToUse = bucket || storeBucket;
  const combinedFilters = [...globalFilters, ...dynamicFilters];

  const params = buildApiParams(timeToUse, { filters: combinedFilters });

  return useQuery({
    queryKey: ["performance-time-series", timeToUse, bucketToUse, site, combinedFilters, selectedPerformanceMetric, timezone],
    queryFn: () => {
      return fetchPerformanceTimeSeries(site, { ...params, bucket: bucketToUse }).then(data => ({ data }));
    },
    placeholderData: (_, query: any) => {
      if (!query?.queryKey) return undefined;
      const [, , , prevSite] = query.queryKey as [string, any, TimeBucket, string | number, Filter[], string];

      if (prevSite === site) {
        return query.state.data;
      }
      return undefined;
    },
    staleTime: Infinity,
    ...props,
  });
}
