import { UseQueryResult } from "@tanstack/react-query";
import { ErrorNamesPaginatedResponse } from "../../endpoints";
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
}: UseGetErrorNamesOptions): UseQueryResult<ErrorNamesPaginatedResponse> {
  return useAnalyticsQuery<ErrorNamesPaginatedResponse>({
    key: "error-names",
    path: "errors/names",
    useFilters,
    params: { limit, page },
    staleTime: Infinity,
  });
}

// Hook for standard (non-paginated) fetching
export function useGetErrorNames({
  limit = 10,
  useFilters = true,
}: Omit<UseGetErrorNamesOptions, "page">): UseQueryResult<ErrorNamesPaginatedResponse> {
  return useAnalyticsQuery<ErrorNamesPaginatedResponse>({
    key: "error-names",
    path: "errors/names",
    useFilters,
    params: { limit },
    staleTime: Infinity,
  });
}
