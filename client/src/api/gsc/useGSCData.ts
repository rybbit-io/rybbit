import { useQuery } from "@tanstack/react-query";
import { Time } from "../../components/DateSelector/types";
import { useStore } from "../../lib/store";
import { authedFetch, getQueryParams } from "../utils";

export type GSCDimension = "query" | "page" | "country" | "device";

export type GSCData = {
  name: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

/**
 * Hook to fetch data from Google Search Console for a specific dimension
 */
export function useGSCData(dimension: GSCDimension) {
  const { site, time } = useStore();

  const timeParams = getQueryParams(time);

  return useQuery({
    queryKey: ["gsc-data", dimension, site, timeParams],
    enabled: !!site,
    queryFn: () => {
      return authedFetch<{ data: GSCData[] }>(`/gsc/data/${site}`, {
        ...timeParams,
        dimension,
      }).then((res) => res.data);
    },
    // Refetch less frequently since GSC data updates slowly
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Standalone fetch function for GSC data (used for exports)
 */
export async function fetchGSCData(
  site: number | string,
  dimension: GSCDimension,
  time: Time
): Promise<GSCData[]> {
  const timeParams = getQueryParams(time);
  const response = await authedFetch<{ data: GSCData[] }>(`/gsc/data/${site}`, {
    ...timeParams,
    dimension,
  });
  return response.data;
}
