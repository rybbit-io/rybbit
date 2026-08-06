import { usePerformanceStore } from "../../../../app/[site]/performance/performanceStore";
import { fetchPerformanceOverview, GetPerformanceOverviewResponse, PerformanceOverviewParams } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

type PeriodTime = "current" | "previous";

export function useGetPerformanceOverview({ periodTime, site }: { periodTime?: PeriodTime; site?: number | string }) {
  const { selectedPercentile } = usePerformanceStore();

  return useAnalyticsQuery<{ data: GetPerformanceOverviewResponse }, PerformanceOverviewParams>({
    key: "performance-overview",
    site,
    periodTime,
    extraParams: { percentile: selectedPercentile },
    staleTime: Infinity,
    fetch: (site, params) => fetchPerformanceOverview(site, params).then(data => ({ data })),
  });
}
