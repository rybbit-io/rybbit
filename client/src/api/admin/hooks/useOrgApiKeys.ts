import { ORG_API_KEY_CONFIG_ID } from "@rybbit/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "../../../lib/auth";
import { authedFetch } from "../../utils";

// List an organization's API keys (better-auth returns only keys the caller
// may read: org admins/owners)
export const useListOrgApiKeys = (organizationId?: string) => {
  return useQuery({
    queryKey: ["orgApiKeys", organizationId],
    queryFn: async () => {
      const response = await authClient.apiKey.list({ query: { organizationId: organizationId! } });
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    enabled: !!organizationId,
  });
};

// Create an organization-owned API key (custom endpoint for plan-based rate
// limits and key-count limits)
export const useCreateOrgApiKey = (organizationId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; expiresIn?: number; permissions?: Record<string, string[]> }) => {
      return authedFetch<{ key: string; id: string }>(`/organizations/${organizationId}/api-keys`, undefined, {
        method: "POST",
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orgApiKeys", organizationId] });
    },
  });
};

// Delete an organization API key. configId routes better-auth to the org key
// configuration, which authorizes via the caller's org role.
export const useDeleteOrgApiKey = (organizationId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (keyId: string) => {
      const response = await authClient.apiKey.delete({
        keyId,
        configId: ORG_API_KEY_CONFIG_ID,
      });
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orgApiKeys", organizationId] });
    },
  });
};
