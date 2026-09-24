import { useStore } from "@/lib/store";
import { UseQueryResult } from "@tanstack/react-query";
import { GetErrorBucketedResponse } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

type UseGetErrorBucketedOptions = {
  errorMessage: string;
};

export function useGetErrorBucketed({
  errorMessage,
}: UseGetErrorBucketedOptions): UseQueryResult<GetErrorBucketedResponse> {
  const bucket = useStore(state => state.bucket);

  return useAnalyticsQuery<GetErrorBucketedResponse>({
    key: "error-bucketed",
    path: "errors/time-series",
    params: { errorMessage, bucket },
    enabled: !!errorMessage,
    staleTime: Infinity,
  });
}
