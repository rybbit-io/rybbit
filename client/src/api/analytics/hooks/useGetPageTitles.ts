import { UseQueryResult } from "@tanstack/react-query";
import { fetchPageTitles, PageTitlesParams, PageTitlesPaginatedResponse } from "../endpoints";
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
}: UseGetPageTitlesOptions): UseQueryResult<{ data: PageTitlesPaginatedResponse }> {
  return useAnalyticsQuery<{ data: PageTitlesPaginatedResponse }, PageTitlesParams>({
    key: "page-titles",
    periodTime,
    useFilters,
    extraParams: { limit, page },
    staleTime: Infinity,
    fetch: (site, params) => fetchPageTitles(site, params).then(data => ({ data })),
  });
}
