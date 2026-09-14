import { useQuery } from "@tanstack/react-query";
import { useStore, useTimezone } from "../../../lib/store";
import { fetchGSCData, GSCDimension } from "../endpoints";
import { getGSCDateRange } from "../gscDateRange";

/**
 * Hook to fetch data from Google Search Console for a specific dimension
 */
export function useGetGSCData(dimension: GSCDimension) {
  const site = useStore(state => state.site);
  const time = useStore(state => state.time);
  // Resolved zone, never the "system" sentinel — the API needs a real IANA zone
  const timeZone = useTimezone();
  const { startDate, endDate } = getGSCDateRange(time, timeZone);

  return useQuery({
    queryKey: ["gsc-data", dimension, site, startDate, endDate, timeZone],
    queryFn: () => fetchGSCData(site!, { dimension, startDate, endDate, timeZone }),
    enabled: !!site,
    // Refetch less frequently since GSC data updates slowly
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
