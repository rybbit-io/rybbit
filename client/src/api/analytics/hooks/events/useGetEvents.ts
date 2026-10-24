import { useQuery } from "@tanstack/react-query";
import { buildAnalyticsRequest, fetchAnalytics } from "../../analyticsRequest";
import { CursorEventsResponse, Event } from "../../endpoints";
import { useAnalyticsContext, useAnalyticsInfiniteQuery } from "../../useAnalyticsQuery";

/**
 * An event as the log endpoint returns it. `event_cursor` is epoch milliseconds
 * plus a hash of the event: it pages and polls exactly (by the whole-second
 * `timestamp`, the other events in the boundary second were skipped) and tells
 * the event apart from every other one.
 */
export type EventLogEvent = Event & { event_cursor: string };

export type EventsCursorPage = Omit<CursorEventsResponse, "data"> & {
  data: EventLogEvent[];
  cursor: CursorEventsResponse["cursor"] & { oldestCursor?: string | null; newestCursor?: string | null };
};

/**
 * `nextCursor` is where the next poll resumes. It trails the newest event by
 * the window the server reads again (events can be inserted out of order), so
 * a poll repeats recent rows; tell them apart by `event_cursor`.
 */
export type EventsPollResponse = {
  data: EventLogEvent[];
  cursor?: { nextCursor: string; hasMore: boolean };
};

/**
 * Polls for events newer than a cursor (Realtime mode).
 * The cursor is read from a callback at query time so the query key
 * stays stable and doesn't cause refetch storms.
 */
export function useNewEventsPoll(options: { getSinceCursor: () => string | null; enabled: boolean }) {
  const { site, context } = useAnalyticsContext({ useTime: false });
  const request = buildAnalyticsRequest({ path: "events", unwrap: false }, context);

  return useQuery({
    queryKey: ["events-poll", site, request.params],
    queryFn: () => {
      const since = options.getSinceCursor();
      if (!since) return { data: [] } as EventsPollResponse;
      return fetchAnalytics<EventsPollResponse>(site, {
        ...request,
        params: { ...request.params, since_cursor: since },
      });
    },
    // A backlog over the server's limit comes back a page at a time, oldest
    // first: fetch the next page straight away.
    refetchInterval: query => (query.state.data?.cursor?.hasMore ? 250 : 2000),
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

  return useAnalyticsInfiniteQuery<EventsCursorPage, string | null>({
    key: "events-cursor",
    path: "events",
    unwrap: false,
    useTime: !options.isRealtime,
    params: { page_size: pageSize },
    initialPageParam: null,
    staleTime: 0,
    pageParams: cursor => ({ before_cursor: cursor ?? undefined }),
    getNextPageParam: lastPage =>
      lastPage.cursor?.hasMore && lastPage.cursor.oldestCursor ? lastPage.cursor.oldestCursor : undefined,
  });
}
