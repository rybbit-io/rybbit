import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPrivateLinkConfig,
  generatePrivateLinkKey,
  revokePrivateLinkKey,
} from "../endpoints";

// Get API config
export const useGetPrivateLinkConfig = (siteId: number) => {
  return useQuery({
    queryKey: ["privateLinkConfig", siteId],
    queryFn: async () => {
      const response = await getPrivateLinkConfig(siteId);
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
      const response = await generatePrivateLinkKey(siteId);
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
      const response = await revokePrivateLinkKey(siteId);
      return response.data;
    },
    onSuccess: (_, siteId) => {
      queryClient.invalidateQueries({ queryKey: ["privateLinkConfig", siteId] });
    },
  });
};
