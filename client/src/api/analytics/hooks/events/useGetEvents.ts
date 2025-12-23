import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Time } from "../../../../components/DateSelector/types";
import { getTimezone, useStore } from "../../../../lib/store";
import { buildApiParams } from "../../../utils";
import { EventsResponse, fetchEvents } from "../../endpoints";

export interface GetEventsOptions {
  time?: Time;
  page?: number;
  pageSize?: number;
  count?: number; // For backward compatibility
  isRealtime?: boolean;
}

export function useGetEvents(count = 10) {
  const { site, timezone } = useStore();

  return useQuery({
    queryKey: ["events", site, count, timezone],
    refetchInterval: 5000,
    queryFn: () =>
      fetchEvents(site, {
        startDate: "",
        endDate: "",
        timeZone: getTimezone(),
        limit: count,
      }).then(res => res.data),
    enabled: !!site,
  });
}

// Hook with pagination and filtering support
export function useGetEventsInfinite(options: GetEventsOptions = {}) {
  const { site, time, filters, timezone } = useStore();
  const pageSize = options.pageSize || 20;

  const params = buildApiParams(time, {
    filters: filters && filters.length > 0 ? filters : undefined,
  });

  return useInfiniteQuery<EventsResponse, Error>({
    queryKey: ["events-infinite", site, time, filters, pageSize, options.isRealtime, timezone],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      return fetchEvents(site, {
        ...params,
        page: pageParam as number,
        pageSize,
        limit: options.count,
      });
    },
    getNextPageParam: (lastPage: EventsResponse) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    refetchInterval: options.isRealtime ? 5000 : undefined,
    enabled: !!site,
  });
}
