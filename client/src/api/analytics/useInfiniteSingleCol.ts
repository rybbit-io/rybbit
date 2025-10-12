import { FilterParameter } from "@rybbit/shared";
import { useInfiniteQuery, UseInfiniteQueryResult, InfiniteData } from "@tanstack/react-query";
import { SingleColResponse } from "@/api/analytics/useSingleCol";
import { authedFetch, getQueryParams } from "@/api/utils";
import { timeZone } from "@/lib/dateTimeUtils";
import { useStore } from "@/lib/store";

type UseInfiniteSingleColOptions = {
  parameter: FilterParameter;
  limit?: number;
  useFilters?: boolean;
};

export type InfinitePaginatedResponse = {
  data: SingleColResponse[];
  totalCount: number;
};

export function useInfiniteSingleCol({
  parameter,
  limit = 25,
  useFilters = true,
}: UseInfiniteSingleColOptions): UseInfiniteQueryResult<InfiniteData<InfinitePaginatedResponse>> {
  const { time, site, filters } = useStore();

  return useInfiniteQuery({
    queryKey: [parameter, time, site, filters, limit, "infinite-single-col"],
    queryFn: async ({ pageParam = 1 }) => {
      const queryParams = {
        ...getQueryParams(time),
        parameter,
        limit,
        page: pageParam,
        filters: useFilters ? filters : undefined,
      };

      const response = await authedFetch<{
        data: InfinitePaginatedResponse;
      }>(`/single-col/${site}`, queryParams);
      return response.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      // If we've fetched all items, don't get next page
      const totalItems = lastPage.totalCount;
      const fetchedItemCount = allPages.reduce((acc, page) => acc + page.data.length, 0);

      if (fetchedItemCount >= totalItems) {
        return undefined;
      }

      return allPages.length + 1;
    },
    staleTime: 60_000,
  });
}
