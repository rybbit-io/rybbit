import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authedFetch } from "../utils";

// TypeScript interfaces for API keys
export interface ApiKey {
  id: string;
  name: string | null;
  start: string | null;
  prefix: string | null;
  userId: string;
  enabled: boolean;
  rateLimitEnabled: boolean;
  rateLimitTimeWindow: number | null;
  rateLimitMax: number | null;
  requestCount: number;
  remaining: number | null;
  lastRequest: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKeyWithKey extends ApiKey {
  key: string; // The full API key, only returned on creation
}

export interface CreateApiKeyRequest {
  name: string;
  expiresIn?: number;
}

// List all API keys for the current user
export const useListApiKeys = () => {
  return useQuery<ApiKey[]>({
    queryKey: ["userApiKeys"],
    queryFn: async () => {
      const response = await authedFetch<ApiKey[]>("/user/api-keys");
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
        const response = await authedFetch<ApiKeyWithKey>("/user/api-keys", undefined, {
          method: "POST",
          data,
        });
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
        const response = await authedFetch<{ success: boolean }>(`/user/api-keys/${keyId}`, undefined, {
          method: "DELETE",
        });
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
