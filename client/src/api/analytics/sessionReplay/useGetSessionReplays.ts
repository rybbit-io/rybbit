import { useInfiniteQuery } from "@tanstack/react-query";
import { useStore } from "../../../lib/store";
import { authedFetch, getQueryParams } from "../../utils";

export interface SessionReplayListItem {
  session_id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  duration_ms?: number;
  page_url: string;
  event_count: number;
  country: string;
  region: string;
  city: string;
  browser: string;
  browser_version: string;
  operating_system: string;
  operating_system_version: string;
  device_type: string;
  screen_width: number;
  screen_height: number;
}

export interface SessionReplayListResponse {
  data: SessionReplayListItem[];
  totalCount: number;
}

type UseGetSessionReplaysOptions = {
  limit?: number;
  minDuration?: number;
};

export function useGetSessionReplays({ limit = 20, minDuration = 30 }: UseGetSessionReplaysOptions = {}) {
  const { time, site, filters } = useStore();

  return useInfiniteQuery({
    queryKey: ["session-replays", site, time, filters, limit, minDuration],
    queryFn: async ({ pageParam = 0 }) => {
      const queryParams = {
        ...getQueryParams(time),
        limit,
        offset: pageParam,
        filters,
        minDuration,
      };

      const response = await authedFetch<SessionReplayListResponse>(`/session-replay/list/${site}`, queryParams);
      return response;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((acc, page) => acc + (page.data?.length || 0), 0);
      return lastPage.data?.length === limit ? totalFetched : undefined;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
