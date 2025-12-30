import { useQuery } from "@tanstack/react-query";
import { useStore } from "../../../lib/store";
import { fetchLiveUserCount, LiveUserCountResponse } from "../endpoints";

export function useGetLiveUserCount(minutes = 5) {
  const { site } = useStore();
  return useQuery<LiveUserCountResponse>({
    queryKey: ["live-user-count", site, minutes],
    refetchInterval: 10000,
    queryFn: () => fetchLiveUserCount(site, minutes),
    enabled: !!site,
  });
}
