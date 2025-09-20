import { SingleColResponse } from "@/api/analytics/useSingleCol";
import { authedFetch, getQueryParams } from "@/api/utils";
import { useStore } from "@/lib/store";
import { Filter, FilterParameter } from "@rybbit/shared";
import { useQuery, UseQueryResult } from "@tanstack/react-query";

type UsePaginatedSingleColOptions = {
  parameter: FilterParameter;
  limit?: number;
  page?: number;
  useFilters?: boolean;
  enabled?: boolean;
  additionalFilters?: Filter[];
};

type PaginatedResponse = {
  data: SingleColResponse[];
  totalCount: number;
};

export function usePaginatedSingleCol({
  parameter,
  limit = 10,
  page = 1,
  useFilters = true,
  enabled = true,
  additionalFilters = [],
}: UsePaginatedSingleColOptions): UseQueryResult<PaginatedResponse> {
  const { time, site, filters } = useStore();

  const queryParams = {
    ...getQueryParams(time),
    parameter,
    limit,
    page,
    filters: useFilters ? [...filters, ...additionalFilters] : undefined,
  };

  return useQuery({
    queryKey: [parameter, time, site, filters, limit, page, additionalFilters],
    queryFn: async () => {
      const response = await authedFetch<{ data: PaginatedResponse }>(`/single-col/${site}`, queryParams);
      return response.data;
    },
    staleTime: 60_000,
    placeholderData: (_, query: any) => {
      if (!query?.queryKey) return undefined;
      const prevQueryKey = query.queryKey;
      const [, , prevSite] = prevQueryKey;

      if (prevSite === site) {
        return query.state.data;
      }
      return undefined;
    },
    enabled,
  });
}
