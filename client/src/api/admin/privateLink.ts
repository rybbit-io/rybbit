import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authedFetch } from "../utils";

interface PrivateLinkConfigResponse {
  privateLinkKey: string | null;
}

interface UpdatePrivateLinkConfigResponse {
  privateLinkKey: string | null;
}

// Get API config
export const useGetPrivateLinkConfig = (siteId: number) => {
  return useQuery({
    queryKey: ["privateLinkConfig", siteId],
    queryFn: async () => {
      const response = await authedFetch<{
        success: boolean;
        data: PrivateLinkConfigResponse;
      }>(`/site/${siteId}/private-link-config`);
      return response.data;
    },
    enabled: !!siteId,
  });
};

// Generate private link key
export const useGeneratePrivateLinkKey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (siteId: number) => {
      const response = await authedFetch<{
        success: boolean;
        data: UpdatePrivateLinkConfigResponse;
      }>(
        `/site/${siteId}/private-link-config`,
        {},
        {
          method: "POST",
          data: { action: "generate_private_link_key" },
        }
      );
      return response.data;
    },
    onSuccess: (_, siteId) => {
      queryClient.invalidateQueries({ queryKey: ["privateLinkConfig", siteId] });
    },
  });
};

// Revoke private link key
export const useRevokePrivateLinkKey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (siteId: number) => {
      const response = await authedFetch<{
        success: boolean;
        data: UpdatePrivateLinkConfigResponse;
      }>(
        `/site/${siteId}/private-link-config`,
        {},
        {
          method: "POST",
          data: { action: "revoke_private_link_key" },
        }
      );
      return response.data;
    },
    onSuccess: (_, siteId) => {
      queryClient.invalidateQueries({ queryKey: ["privateLinkConfig", siteId] });
    },
  });
};
