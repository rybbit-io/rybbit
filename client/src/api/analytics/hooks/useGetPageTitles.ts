import { UseQueryResult } from "@tanstack/react-query";
import { PageTitlesPaginatedResponse } from "../endpoints";
import { useAnalyticsQuery } from "../useAnalyticsQuery";

type PeriodTime = "current" | "previous";

type UseGetPageTitlesOptions = {
  limit?: number;
  page?: number;
  useFilters?: boolean;
  periodTime?: PeriodTime;
};

// Hook for paginated fetching (e.g., for a dedicated "All Page Titles" screen)
export function useGetPageTitlesPaginated({
  limit = 10,
  page = 1,
  useFilters = true,
  periodTime = "current",
}: UseGetPageTitlesOptions): UseQueryResult<PageTitlesPaginatedResponse> {
  return useAnalyticsQuery<PageTitlesPaginatedResponse>({
    key: "page-titles",
    path: "page-titles",
    periodTime,
    useFilters,
    params: { limit, page },
    staleTime: Infinity,
  });
}
