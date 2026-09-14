import { SessionReplayListResponse } from "../../endpoints";
import { useAnalyticsInfiniteQuery } from "../../useAnalyticsQuery";

type UseGetSessionReplaysOptions = {
  limit?: number;
  minDuration?: number;
};

export function useGetSessionReplays({ limit = 20, minDuration = 30 }: UseGetSessionReplaysOptions = {}) {
  return useAnalyticsInfiniteQuery<SessionReplayListResponse>({
    key: "session-replays",
    path: "session-replay/list",
    unwrap: false,
    params: { limit, minDuration },
    initialPageParam: 0,
    pageParams: offset => ({ offset }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.data?.length === limit ? allPages.reduce((total, page) => total + (page.data?.length || 0), 0) : undefined,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
