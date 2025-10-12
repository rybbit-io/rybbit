import { useStore } from "@/lib/store";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { APIResponse } from "../types";
import { authedFetch, getQueryParams } from "../utils";

// This should match PageTitleItem from the backend
export type PageTitleItem = {
  value: string; // The page_title
  pathname: string; // A representative pathname
  count: number;
  percentage: number;
  time_on_page_seconds?: number;
  // Add other potential fields if your backend query for page_titles includes them
};

// This should match the paginated response structure from getPageTitles.ts
export type PageTitlesPaginatedResponse = {
  data: PageTitleItem[];
  totalCount: number;
};

// This is for non-paginated use by StandardSection (or similar)
// It directly expects an array of PageTitleItem	ype PageTitlesStandardResponse = PageTitleItem[];
export type PageTitlesStandardResponse = PageTitleItem[];

type UseGetPageTitlesOptions = {
  limit?: number;
  page?: number;
  useFilters?: boolean;
  // No specific 'parameter' needed as this hook is for page_titles
};

// Hook for paginated fetching (e.g., for a dedicated "All Page Titles" screen)
export function useGetPageTitlesPaginated({
  limit = 10,
  page = 1,
  useFilters = true,
}: UseGetPageTitlesOptions): UseQueryResult<APIResponse<PageTitlesPaginatedResponse>> {
  const { time, site, filters } = useStore();

  const queryParams = {
    ...getQueryParams(time),
    limit,
    page,
    filters: useFilters ? filters : undefined,
  };

  return useQuery({
    queryKey: ["page-titles", time, site, filters, limit, page],
    queryFn: () => {
      return authedFetch<APIResponse<PageTitlesPaginatedResponse>>(`/page-titles/${site}`, queryParams);
    },
    staleTime: Infinity,
  });
}
