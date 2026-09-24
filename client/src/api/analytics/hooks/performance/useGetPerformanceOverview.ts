import { usePerformanceStore } from "../../../../app/[site]/performance/performanceStore";
import { GetPerformanceOverviewResponse } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

type PeriodTime = "current" | "previous";

export function useGetPerformanceOverview({ periodTime, site }: { periodTime?: PeriodTime; site?: number | string }) {
  const { selectedPercentile } = usePerformanceStore();

  return useAnalyticsQuery<GetPerformanceOverviewResponse>({
    key: "performance-overview",
    path: "performance/overview",
    site,
    periodTime,
    params: { percentile: selectedPercentile },
    staleTime: Infinity,
  });
}
