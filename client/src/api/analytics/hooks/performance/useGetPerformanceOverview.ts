import { useQuery } from "@tanstack/react-query";
import { usePerformanceStore } from "../../../../app/[site]/performance/performanceStore";
import { useStore } from "../../../../lib/store";
import { buildApiParams } from "../../../utils";
import { fetchPerformanceOverview } from "../../endpoints";

type PeriodTime = "current" | "previous";

export function useGetPerformanceOverview({ periodTime, site }: { periodTime?: PeriodTime; site?: number | string }) {
  const { time, previousTime, filters, timezone } = useStore();
  const { selectedPercentile } = usePerformanceStore();
  const timeToUse = periodTime === "previous" ? previousTime : time;

  const params = buildApiParams(timeToUse, { filters });

  return useQuery({
    queryKey: ["performance-overview", timeToUse, site, filters, selectedPercentile, timezone],
    queryFn: () => {
      return fetchPerformanceOverview(site!, {
        ...params,
        percentile: selectedPercentile,
      }).then(data => ({ data }));
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
