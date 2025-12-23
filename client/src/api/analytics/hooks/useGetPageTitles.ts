import { useStore } from "@/lib/store";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { buildApiParams } from "../../utils";
import { fetchPageTitles, PageTitlesPaginatedResponse } from "../endpoints";

type UseGetPageTitlesOptions = {
  limit?: number;
  page?: number;
  useFilters?: boolean;
};

// Hook for paginated fetching (e.g., for a dedicated "All Page Titles" screen)
export function useGetPageTitlesPaginated({
  limit = 10,
  page = 1,
  useFilters = true,
}: UseGetPageTitlesOptions): UseQueryResult<{ data: PageTitlesPaginatedResponse }> {
  const { time, site, filters, timezone } = useStore();

  const params = buildApiParams(time, { filters: useFilters ? filters : undefined });

  return useQuery({
    queryKey: ["page-titles", time, site, filters, limit, page, useFilters, timezone],
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
