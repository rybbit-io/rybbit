import { useStore } from "@/lib/store";
import { UseQueryResult } from "@tanstack/react-query";
import { ErrorBucketedParams, fetchErrorBucketed, GetErrorBucketedResponse } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

type UseGetErrorBucketedOptions = {
  errorMessage: string;
};

export function useGetErrorBucketed({
  errorMessage,
}: UseGetErrorBucketedOptions): UseQueryResult<GetErrorBucketedResponse> {
  const { bucket } = useStore();

  return useAnalyticsQuery<GetErrorBucketedResponse, ErrorBucketedParams>({
    key: "error-bucketed",
    extraParams: { errorMessage, bucket },
    enabled: !!errorMessage,
    staleTime: Infinity,
    fetch: (site, params) => fetchErrorBucketed(site, params),
  });
}
