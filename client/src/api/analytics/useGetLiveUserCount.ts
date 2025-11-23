import { useQuery } from "@tanstack/react-query";
import { useStore } from "../../lib/store";
import { authedFetch } from "../utils";

export interface LiveUserCountResponse {
  count: number;
}

export function useGetLiveUsercount(minutes = 5) {
  const { site } = useStore();
  return useQuery<LiveUserCountResponse>({
    queryKey: ["live-user-count", site, minutes],
    refetchInterval: 5000,
    queryFn: () =>
      authedFetch<LiveUserCountResponse>(`/live-user-count/${site}`, {
        minutes,
      }),
  });
}
