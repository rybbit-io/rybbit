import { useQuery } from "@tanstack/react-query";
import { fetchSiteEventCount } from "../endpoints";

/**
 * Site event counts over an explicit date range, for the settings usage chart.
 *
 * Distinct from the dashboard's `useGetSiteEventCount`, which reads the global
 * analytics context: this one is driven by the period picker in Site Settings
 * and must not react to the dashboard's time range or filters.
 */
export function useGetSiteEventCountRange({
  siteId,
  startDate,
  endDate,
  timeZone = "UTC",
}: {
  siteId?: number;
  startDate?: string;
  endDate?: string;
  timeZone?: string;
}) {
  return useQuery({
    queryKey: ["site-event-count-range", siteId, startDate, endDate, timeZone],
    queryFn: () =>
      fetchSiteEventCount(siteId!, {
        startDate: startDate ?? "",
        endDate: endDate ?? "",
        timeZone,
        bucket: "day",
      }),
    enabled: !!siteId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
