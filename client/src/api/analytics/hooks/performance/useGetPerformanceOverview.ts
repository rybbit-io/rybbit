import { GetPerformanceOverviewResponse } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

type PeriodTime = "current" | "previous";

// The response carries every percentile, so the percentile picker never refetches.
export function useGetPerformanceOverview({ periodTime, site }: { periodTime?: PeriodTime; site?: number | string }) {
  return useAnalyticsQuery<GetPerformanceOverviewResponse>({
    key: "performance-overview",
    path: "performance/overview",
    site,
    periodTime,
    staleTime: Infinity,
  });
}
