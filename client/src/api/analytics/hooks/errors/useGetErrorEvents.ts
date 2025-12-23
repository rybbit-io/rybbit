import { getTimezone, useStore } from "@/lib/store";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getStartAndEndDate } from "../../../utils";
import { ErrorEventsPaginatedResponse, fetchErrorEvents } from "../../endpoints";

// Hook for infinite scrolling
export function useGetErrorEventsInfinite(errorMessage: string, enabled: boolean = true) {
  const { time, site, filters, timezone } = useStore();

  const { startDate, endDate } = getStartAndEndDate(time);

  return useInfiniteQuery({
    queryKey: ["error-events-infinite", time, site, filters, errorMessage, timezone],
    queryFn: async ({ pageParam = 1 }) => {
      const data = await fetchErrorEvents(site, {
        startDate: startDate ?? "",
        endDate: endDate ?? "",
        timeZone: getTimezone(),
        filters,
        errorMessage,
        limit: 20,
        page: pageParam,
      });
      return { data };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: { data: ErrorEventsPaginatedResponse }, allPages) => {
      const currentPage = allPages.length;
      const totalItems = lastPage?.data?.totalCount || 0;
      const itemsPerPage = 20;
      const totalPages = Math.ceil(totalItems / itemsPerPage);

      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    enabled: enabled && !!errorMessage && !!site,
    staleTime: Infinity,
  });
}
