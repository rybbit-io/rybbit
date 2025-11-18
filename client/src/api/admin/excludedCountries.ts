import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authedFetch } from "../utils";
import { updateSiteConfig } from "./sites";

export interface ExcludedCountriesResponse {
  success: boolean;
  excludedCountries: string[];
  error?: string;
}

export interface UpdateExcludedCountriesRequest {
  siteId: number;
  excludedCountries: string[];
}

export interface UpdateExcludedCountriesResponse {
  success: boolean;
  message: string;
  excludedCountries: string[];
  error?: string;
  details?: string[];
}

export const fetchExcludedCountries = async (siteId: string): Promise<ExcludedCountriesResponse> => {
  return await authedFetch<ExcludedCountriesResponse>(`/site/${siteId}/excluded-countries`);
};

export const updateExcludedCountries = async (
  siteId: number,
  excludedCountries: string[]
): Promise<UpdateExcludedCountriesResponse> => {
  const result = await updateSiteConfig(siteId, { excludedCountries });
  
  return {
    success: true,
    message: "Excluded countries updated successfully",
    excludedCountries: excludedCountries,
  };
};

export const useGetExcludedCountries = (siteId: number) => {
  return useQuery({
    queryKey: ["excludedCountries", siteId],
    queryFn: () => fetchExcludedCountries(siteId.toString()),
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
