import { useInfiniteQuery } from "@tanstack/react-query";
import { useStore } from "../../../../lib/store";
import { buildApiParams } from "../../../utils";
import { fetchSessionReplays } from "../../endpoints";

type UseGetSessionReplaysOptions = {
  limit?: number;
  minDuration?: number;
};

export function useGetSessionReplays({ limit = 20, minDuration = 30 }: UseGetSessionReplaysOptions = {}) {
  const { time, site, filters, timezone } = useStore();
  const params = buildApiParams(time, { filters });

  return useInfiniteQuery({
    queryKey: ["session-replays", site, time, filters, limit, minDuration, timezone],
    queryFn: async ({ pageParam = 0 }) => {
      return fetchSessionReplays(site, {
        ...params,
        limit,
        offset: pageParam,
        minDuration,
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((acc, page) => acc + (page.data?.length || 0), 0);
      return lastPage.data?.length === limit ? totalFetched : undefined;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    enabled: !!site,
  });
}
