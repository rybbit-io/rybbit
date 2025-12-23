import { useQuery } from "@tanstack/react-query";
import { Time } from "../../components/DateSelector/types";
import { useStore } from "../../lib/store";
import { toQueryParams } from "../analytics/endpoints/types";
import { authedFetch, buildApiParams } from "../utils";

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
  const { site, time, timezone } = useStore();

  const timeParams = toQueryParams(buildApiParams(time));

  return useQuery({
    queryKey: ["gsc-data", dimension, site, timeParams, timezone],
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
  const timeParams = toQueryParams(buildApiParams(time));
  const response = await authedFetch<{ data: GSCData[] }>(`/gsc/data/${site}`, {
    ...timeParams,
    dimension,
  });
  return response.data;
}
