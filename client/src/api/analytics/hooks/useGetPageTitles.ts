import { useStore } from "@/lib/store";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { buildApiParams } from "../../utils";
import { fetchPageTitles, PageTitlesPaginatedResponse } from "../endpoints";

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
  const { time, previousTime, site, filters, timezone } = useStore();

  const timeToUse = periodTime === "previous" ? previousTime : time;
  const params = buildApiParams(timeToUse, { filters: useFilters ? filters : undefined });

  return useQuery({
    queryKey: ["page-titles", timeToUse, site, filters, limit, page, useFilters, timezone, periodTime],
    queryFn: async () => {
      const data = await fetchPageTitles(site, {
        ...params,
        limit,
        page,
      });
      return { data };
    },
    staleTime: Infinity,
    enabled: !!site,
  });
}
