import { ErrorEventsPaginatedResponse } from "../../endpoints";
import { useAnalyticsInfiniteQuery } from "../../useAnalyticsQuery";

const PAGE_SIZE = 20;

// Hook for infinite scrolling
export function useGetErrorEventsInfinite(errorMessage: string, enabled: boolean = true) {
  return useAnalyticsInfiniteQuery<ErrorEventsPaginatedResponse>({
    key: "error-events-infinite",
    path: "errors/events",
    params: { errorMessage, limit: PAGE_SIZE },
    initialPageParam: 1,
    pageParams: page => ({ page }),
    getNextPageParam: (lastPage, allPages) =>
      allPages.length < Math.ceil((lastPage?.totalCount || 0) / PAGE_SIZE) ? allPages.length + 1 : undefined,
    enabled: enabled && !!errorMessage,
    staleTime: Infinity,
  });
}
