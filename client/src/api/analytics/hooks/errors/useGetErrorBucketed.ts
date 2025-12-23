import { useStore } from "@/lib/store";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { buildApiParams } from "../../../utils";
import { fetchErrorBucketed, GetErrorBucketedResponse } from "../../endpoints";

type UseGetErrorBucketedOptions = {
  errorMessage: string;
};

export function useGetErrorBucketed({
  errorMessage,
}: UseGetErrorBucketedOptions): UseQueryResult<GetErrorBucketedResponse> {
  const { time, site, filters, bucket, timezone } = useStore();

  const params = buildApiParams(time, { filters });

  return useQuery({
    queryKey: ["error-bucketed", time, site, filters, bucket, errorMessage, timezone],
    queryFn: () => {
      return fetchErrorBucketed(site, {
        ...params,
        errorMessage,
        bucket,
      });
    },
    enabled: !!errorMessage && !!site,
    staleTime: Infinity,
  });
}
