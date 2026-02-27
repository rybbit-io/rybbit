import { useQuery } from "@tanstack/react-query";
import { useStore } from "../../../lib/store";
import { buildApiParams } from "../../utils";
import { toQueryParams } from "../../analytics/endpoints/types";
import { fetchGSCData, GSCDimension } from "../endpoints";

/**
 * Hook to fetch data from Google Search Console for a specific dimension
 */
export function useGetGSCData(dimension: GSCDimension) {
  const { site, time, timezone } = useStore();
  const timeParams = toQueryParams(buildApiParams(time));

  return useQuery({
    queryKey: ["gsc-data", dimension, site, timeParams, timezone],
    queryFn: () => {
      return fetchGSCData(site!, {
        dimension,
        startDate: timeParams.start_date,
        endDate: timeParams.end_date,
        timeZone: timezone,
      });
    },
    enabled: !!site,
    // Refetch less frequently since GSC data updates slowly
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
