import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getTimezone, useStore } from "../../../../lib/store";
import { buildApiParams } from "../../../utils";
import {
  CursorEventsResponse,
  fetchEventsCursor,
  fetchNewEvents,
} from "../../endpoints";

/**
 * Polls for new events since a given timestamp (Realtime mode).
 * The sinceTimestamp is read from a callback at query time so the query key
 * stays stable and doesn't cause refetch storms.
 */
export function useNewEventsPoll(options: {
  getSinceTimestamp: () => string | null;
  enabled: boolean;
}) {
  const { site, filters, timezone } = useStore();
  const tz = getTimezone();

  return useQuery({
    queryKey: ["events-poll", site, filters, timezone],
    queryFn: () => {
      const since = options.getSinceTimestamp();
      if (!since) return { data: [] };
      return fetchNewEvents(site, {
        sinceTimestamp: since,
        filters: filters?.length ? filters : undefined,
        timeZone: tz,
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
export function useGetEventsCursor(options: {
  isRealtime: boolean;
  pageSize?: number;
}) {
  const { site, time, filters, timezone } = useStore();
  const pageSize = options.pageSize ?? 50;

  // In realtime mode we skip time params; in historical mode use global time
  const params = options.isRealtime
    ? {
        startDate: "",
        endDate: "",
        timeZone: getTimezone(),
        filters: filters?.length ? filters : undefined,
      }
    : buildApiParams(time, {
        filters: filters?.length ? filters : undefined,
      });

  return useInfiniteQuery<CursorEventsResponse, Error>({
    queryKey: [
      "events-cursor",
      site,
      options.isRealtime,
      options.isRealtime ? null : time,
      filters,
      pageSize,
      timezone,
    ],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      return fetchEventsCursor(site, {
        ...params,
        beforeTimestamp: (pageParam as string) ?? undefined,
        pageSize,
      });
    },
    getNextPageParam: (lastPage: CursorEventsResponse) => {
      if (lastPage.cursor?.hasMore && lastPage.cursor.oldestTimestamp) {
        return lastPage.cursor.oldestTimestamp;
      }
      return undefined;
    },
    enabled: !!site,
  });
}
