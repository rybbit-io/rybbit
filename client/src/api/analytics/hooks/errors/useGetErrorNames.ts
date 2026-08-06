import { UseQueryResult } from "@tanstack/react-query";
import { ErrorNamesParams, ErrorNamesPaginatedResponse, fetchErrorNames } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

type UseGetErrorNamesOptions = {
  limit?: number;
  page?: number;
  useFilters?: boolean;
};

// Hook for paginated fetching (e.g., for a dedicated "All Errors" screen)
export function useGetErrorNamesPaginated({
  limit = 10,
  page = 1,
  useFilters = true,
}: UseGetErrorNamesOptions): UseQueryResult<{ data: ErrorNamesPaginatedResponse }> {
  return useAnalyticsQuery<{ data: ErrorNamesPaginatedResponse }, ErrorNamesParams>({
    key: "error-names",
    useFilters,
    extraParams: { limit, page },
    staleTime: Infinity,
    fetch: (site, params) => fetchErrorNames(site, params).then(data => ({ data })),
  });
}

// Hook for standard (non-paginated) fetching
export function useGetErrorNames({
  limit = 10,
  useFilters = true,
}: Omit<UseGetErrorNamesOptions, "page">): UseQueryResult<{ data: ErrorNamesPaginatedResponse }> {
  return useAnalyticsQuery<{ data: ErrorNamesPaginatedResponse }, ErrorNamesParams>({
    key: "error-names",
    useFilters,
    extraParams: { limit },
    staleTime: Infinity,
    fetch: (site, params) => fetchErrorNames(site, params).then(data => ({ data })),
  });
}
