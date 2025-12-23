import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authedFetch } from "../utils";
import { updateSiteConfig } from "./sites";

export interface ExcludedIPsResponse {
  success: boolean;
  excludedIPs: string[];
  error?: string;
}

export interface UpdateExcludedIPsRequest {
  siteId: number;
  excludedIPs: string[];
}

export interface UpdateExcludedIPsResponse {
  success: boolean;
  message: string;
  excludedIPs: string[];
  error?: string;
  details?: string[];
}

// Fetch excluded IPs for a site
export const fetchExcludedIPs = async (siteId: string): Promise<ExcludedIPsResponse> => {
  return await authedFetch<ExcludedIPsResponse>(`/sites/${siteId}/excluded-ips`);
};

// Update excluded IPs for a site using the consolidated endpoint
export const updateExcludedIPs = async (siteId: number, excludedIPs: string[]): Promise<UpdateExcludedIPsResponse> => {
  const result = await updateSiteConfig(siteId, { excludedIPs });
  // Map the response to match the expected interface
  return {
    success: true,
    message: "Excluded IPs updated successfully",
    excludedIPs: excludedIPs,
  };
};

// Hook to fetch excluded IPs
export const useGetExcludedIPs = (siteId: number) => {
  return useQuery({
    queryKey: ["excludedIPs", siteId],
    queryFn: () => fetchExcludedIPs(siteId.toString()),
    enabled: !!siteId,
  });
};

// Hook to update excluded IPs
export const useUpdateExcludedIPs = () => {
  const queryClient = useQueryClient();

  return useMutation<UpdateExcludedIPsResponse, Error, UpdateExcludedIPsRequest>({
    mutationFn: ({ siteId, excludedIPs }: UpdateExcludedIPsRequest) => updateExcludedIPs(siteId, excludedIPs),
    onSuccess: (_: UpdateExcludedIPsResponse, variables: UpdateExcludedIPsRequest) => {
      toast.success("Excluded IPs updated successfully");
      // Invalidate and refetch excluded IPs data
      queryClient.invalidateQueries({
        queryKey: ["excludedIPs", variables.siteId],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update excluded IPs");
    },
  });
};
