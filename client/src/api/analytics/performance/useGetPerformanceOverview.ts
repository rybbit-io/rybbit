import { useQuery } from "@tanstack/react-query";
import { useStore } from "../../../lib/store";
import { usePerformanceStore } from "../../../app/[site]/performance/performanceStore";
import { authedFetch, getQueryParams } from "../../utils";
import { timeZone } from "../../../lib/dateTimeUtils";

export type GetPerformanceOverviewResponse = {
  current: {
    lcp: number;
    cls: number;
    inp: number;
    fcp: number;
    ttfb: number;
  };
  previous: {
    lcp: number;
    cls: number;
    inp: number;
    fcp: number;
    ttfb: number;
  };
};

type PeriodTime = "current" | "previous";

export function useGetPerformanceOverview({
  periodTime,
  site,
}: {
  periodTime?: PeriodTime;
  site?: number | string;
}) {
  const { time, previousTime, filters } = useStore();
  const { selectedPercentile } = usePerformanceStore();
  const timeToUse = periodTime === "previous" ? previousTime : time;

  const queryParams = getQueryParams(timeToUse, {
    filters,
    percentile: selectedPercentile,
  });

  return useQuery({
    queryKey: [
      "performance-overview",
      timeToUse,
      site,
      filters,
      selectedPercentile,
      timeToUse.mode === "last-24-hours" ? "past-minutes" : "date-range",
    ],
    queryFn: () => {
      return authedFetch<{ data: GetPerformanceOverviewResponse }>(
        `/performance/overview/${site}`,
        queryParams
      );
    },
    staleTime: Infinity,
    placeholderData: (_, query: any) => {
      if (!query?.queryKey) return undefined;
      const prevQueryKey = query.queryKey as [string, string, string];
      const [, , prevSite] = prevQueryKey;

      if (prevSite === site) {
        return query.state.data;
      }
      return undefined;
    },
  });
}
