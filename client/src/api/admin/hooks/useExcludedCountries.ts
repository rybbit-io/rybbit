import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/sonner";
import {
  fetchExcludedCountries,
  updateExcludedCountries,
  UpdateExcludedCountriesRequest,
  UpdateExcludedCountriesResponse,
} from "../endpoints";

export const useGetExcludedCountries = (siteId: number) => {
  return useQuery({
    queryKey: ["excludedCountries", siteId],
    queryFn: () => fetchExcludedCountries(siteId),
    enabled: !!siteId,
  });
};

export const useUpdateExcludedCountries = () => {
  const queryClient = useQueryClient();

  return useMutation<UpdateExcludedCountriesResponse, Error, UpdateExcludedCountriesRequest>({
    mutationFn: ({ siteId, excludedCountries }: UpdateExcludedCountriesRequest) =>
      updateExcludedCountries(siteId, excludedCountries),
    onSuccess: (_: UpdateExcludedCountriesResponse, variables: UpdateExcludedCountriesRequest) => {
      toast.success("Excluded countries updated successfully");
      // Invalidate and refetch excluded countries data
      queryClient.invalidateQueries({
        queryKey: ["excludedCountries", variables.siteId],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update excluded countries");
    },
  });
};
