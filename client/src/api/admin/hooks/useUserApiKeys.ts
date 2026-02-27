import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listApiKeys,
  createApiKey,
  deleteApiKey,
  ApiKey,
  ApiKeyWithKey,
  CreateApiKeyRequest,
} from "../endpoints";

// List all API keys for the current user
export const useListApiKeys = () => {
  return useQuery<ApiKey[]>({
    queryKey: ["userApiKeys"],
    queryFn: async () => {
      const response = await listApiKeys();
      return response;
    },
  });
};

// Create a new API key
export const useCreateApiKey = () => {
  const queryClient = useQueryClient();

  return useMutation<ApiKeyWithKey, Error, CreateApiKeyRequest>({
    mutationFn: async (data) => {
      try {
        const response = await createApiKey(data);
        return response;
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Failed to create API key");
      }
    },
    onSuccess: () => {
      // Invalidate the list to refresh
      queryClient.invalidateQueries({ queryKey: ["userApiKeys"] });
    },
  });
};

// Delete an API key
export const useDeleteApiKey = () => {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: async (keyId) => {
      try {
        const response = await deleteApiKey(keyId);
        return response;
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Failed to delete API key");
      }
    },
    onSuccess: () => {
      // Invalidate the list to refresh
      queryClient.invalidateQueries({ queryKey: ["userApiKeys"] });
    },
  });
};
