import { useQuery } from "@tanstack/react-query";
import { fetchSiteEventCount } from "../endpoints";

export function useGetSiteEventCount({
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
    queryKey: ["site-event-count", siteId, startDate, endDate, timeZone],
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
