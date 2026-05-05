import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "../../../lib/auth";
import { authedFetch } from "../../utils";

// List all API keys for the current user
export const useListApiKeys = () => {
  return useQuery({
    queryKey: ["userApiKeys"],
    queryFn: async () => {
      const response = await authClient.apiKey.list();
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
  });
};

// Create a new API key (uses custom endpoint for plan-based rate limits)
export const useCreateApiKey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; expiresIn?: number }) => {
      return authedFetch<{ key: string; id: string }>("/user/api-keys", undefined, {
        method: "POST",
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userApiKeys"] });
    },
  });
};

// Delete an API key
export const useDeleteApiKey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (keyId: string) => {
      const response = await authClient.apiKey.delete({
        keyId,
      });
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userApiKeys"] });
    },
  });
};
