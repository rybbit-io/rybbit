import { LiveUserCountResponse } from "../endpoints";
import { useAnalyticsQuery } from "../useAnalyticsQuery";

export function useGetLiveUserCount(minutes = 5) {
  return useAnalyticsQuery<LiveUserCountResponse>({
    key: "live-user-count",
    path: "live-user-count",
    unwrap: false,
    useTime: false,
    useFilters: false,
    params: { minutes },
    refetchInterval: 10000,
    staleTime: 0,
    placeholder: false,
  });
}
