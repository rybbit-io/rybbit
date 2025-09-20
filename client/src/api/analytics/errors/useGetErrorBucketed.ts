import { useStore } from "@/lib/store";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { authedFetch, getQueryParams } from "../../utils";

// This should match GetErrorBucketedResponse from the backend
export type GetErrorBucketedResponse = {
  time: string;
  error_count: number;
}[];

type UseGetErrorBucketedOptions = {
  errorMessage: string;
  enabled?: boolean;
};

export function useGetErrorBucketed({
  errorMessage,
  enabled = true,
}: UseGetErrorBucketedOptions): UseQueryResult<GetErrorBucketedResponse> {
  const { time, site, filters, bucket } = useStore();

  const queryParams = {
    ...getQueryParams(time),
    bucket,
    errorMessage,
    filters,
  };

  return useQuery({
    queryKey: ["error-bucketed", time, site, filters, bucket, errorMessage],
    queryFn: () => {
      return authedFetch<any>(`/error-bucketed/${site}`, queryParams).then(res => {
        return res.data;
      });
    },
    enabled: enabled && !!errorMessage && !!site,
    staleTime: Infinity,
  });
}
