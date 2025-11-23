import { useStore } from "@/lib/store";
import { useInfiniteQuery } from "@tanstack/react-query";
import { APIResponse } from "../../types";
import { authedFetch, getQueryParams } from "../../utils";

// This should match ErrorEvent from the backend
export type ErrorEvent = {
  timestamp: string;
  session_id: string;
  user_id: string | null;
  pathname: string | null;
  hostname: string | null;
  page_title: string | null;
  referrer: string | null;
  browser: string | null;
  browser_version: string | null;
  operating_system: string | null;
  operating_system_version: string | null;
  device_type: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  // Parsed error properties (now from backend)
  message: string;
  stack: string | null;
  fileName: string | null;
  lineNumber: number | null;
  columnNumber: number | null;
};

// This should match the paginated response structure from getErrorEvents.ts
export type ErrorEventsPaginatedResponse = {
  data: ErrorEvent[];
  totalCount: number;
};

// This is for non-paginated use
export type ErrorEventsStandardResponse = ErrorEvent[];

type UseGetErrorEventsOptions = {
  errorMessage: string;
  limit?: number;
  page?: number;
  useFilters?: boolean;
  enabled?: boolean;
};

// Hook for infinite scrolling
export function useGetErrorEventsInfinite(errorMessage: string, enabled: boolean = true) {
  const { time, site, filters } = useStore();

  return useInfiniteQuery({
    queryKey: ["error-events-infinite", time, site, filters, errorMessage],
    queryFn: async ({ pageParam = 1 }) => {
      const queryParams = {
        ...getQueryParams(time),
        errorMessage,
        limit: 20,
        page: pageParam,
        filters,
      };

      return authedFetch<APIResponse<ErrorEventsPaginatedResponse>>(`/error-events/${site}`, queryParams);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: APIResponse<ErrorEventsPaginatedResponse>, allPages) => {
      const currentPage = allPages.length;
      const totalItems = lastPage.data?.totalCount || 0;
      const itemsPerPage = 20;
      const totalPages = Math.ceil(totalItems / itemsPerPage);

      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    enabled: enabled && !!errorMessage && !!site,
    staleTime: Infinity,
  });
}
