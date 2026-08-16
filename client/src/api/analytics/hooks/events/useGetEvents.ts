import { useQuery } from "@tanstack/react-query";
import { buildAnalyticsRequest, fetchAnalytics } from "../../analyticsRequest";
import { CursorEventsResponse, NewEventsResponse } from "../../endpoints";
import { useAnalyticsContext, useAnalyticsInfiniteQuery } from "../../useAnalyticsQuery";

/**
 * Polls for new events since a given timestamp (Realtime mode).
 * The sinceTimestamp is read from a callback at query time so the query key
 * stays stable and doesn't cause refetch storms.
 */
export function useNewEventsPoll(options: { getSinceTimestamp: () => string | null; enabled: boolean }) {
  const { site, context } = useAnalyticsContext({ useTime: false });
  const request = buildAnalyticsRequest({ path: "events", unwrap: false }, context);

  return useQuery({
    queryKey: ["events-poll", site, request.params],
    queryFn: () => {
      const since = options.getSinceTimestamp();
      if (!since) return { data: [] } as NewEventsResponse;
      return fetchAnalytics<NewEventsResponse>(site, {
        ...request,
        params: { ...request.params, since_timestamp: since },
      });
    },
    refetchInterval: 2000,
    enabled: !!site && options.enabled,
  });
}

/**
 * Cursor-based infinite query for loading events.
 * In Realtime mode: no time range, just filters.
 * In Historical mode: uses global time + filters from store.
 */
export function useGetEventsCursor(options: { isRealtime: boolean; pageSize?: number }) {
  const pageSize = options.pageSize ?? 50;

  return useAnalyticsInfiniteQuery<CursorEventsResponse, string | null>({
    key: "events-cursor",
    path: "events",
    unwrap: false,
    useTime: !options.isRealtime,
    params: { page_size: pageSize },
    initialPageParam: null,
    staleTime: 0,
    pageParams: cursor => ({ before_timestamp: cursor ?? undefined }),
    getNextPageParam: lastPage =>
      lastPage.cursor?.hasMore && lastPage.cursor.oldestTimestamp ? lastPage.cursor.oldestTimestamp : undefined,
  });
}
