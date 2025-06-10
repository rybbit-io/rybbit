import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Time } from "../../../components/DateSelector/types";
import { useStore } from "../../../lib/store";
import { authedFetch, getStartAndEndDate } from "../../utils";
import { timeZone } from "../../../lib/dateTimeUtils";

export type Event = {
  timestamp: string;
  event_name: string;
  properties: string;
  user_id: string;
  hostname: string;
  pathname: string;
  querystring: string;
  page_title: string;
  referrer: string;
  browser: string;
  operating_system: string;
  country: string;
  device_type: string;
  type: string;
};

export interface EventsResponse {
  data: Event[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface GetEventsOptions {
  time?: Time;
  page?: number;
  pageSize?: number;
  count?: number; // For backward compatibility
  isRealtime?: boolean;
}

export function useGetEvents(count = 10) {
  const { site } = useStore();
  return useQuery({
    queryKey: ["events", site, count],
    refetchInterval: 5000,
    queryFn: () =>
      authedFetch<{ data: Event[] }>(`/recent-events/${site}`, {
        count,
      }).then((res) => res.data),
  });
}

// New hook with pagination and filtering support
export function useGetEventsInfinite(options: GetEventsOptions = {}) {
  const { site, time, filters } = useStore();
  const { startDate, endDate } = options.time
    ? getStartAndEndDate(options.time)
    : getStartAndEndDate(time);
  const pageSize = options.pageSize || 20;

  return useInfiniteQuery<EventsResponse, Error>({
    queryKey: [
      "events-infinite",
      site,
      startDate,
      endDate,
      timeZone,
      filters,
      pageSize,
      options.isRealtime,
    ],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const params: Record<string, any> = {
        startDate,
        endDate,
        timeZone,
        page: pageParam,
        pageSize,
      };

      // Add filters if provided
      if (filters && filters.length > 0) {
        params.filters = JSON.stringify(filters);
      }

      // Add count if provided (for backward compatibility)
      if (options.count) {
        params.count = options.count;
      }

      const response = await authedFetch<EventsResponse>(
        `/events/${site}`,
        params
      );
      return response;
    },
    getNextPageParam: (lastPage: EventsResponse) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    refetchInterval: options.isRealtime ? 5000 : undefined,
  });
}
