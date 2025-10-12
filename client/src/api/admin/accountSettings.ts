import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authedFetch } from "../utils";

export interface UpdateAccountSettingsRequest {
  sendAutoEmailReports?: boolean;
  // Add more settings here in the future
}

export interface UpdateAccountSettingsResponse {
  success: boolean;
  settings: {
    sendAutoEmailReports: boolean;
    // Add more settings here as they're added
  };
}

export function useUpdateAccountSettings() {
  const queryClient = useQueryClient();

  return useMutation<UpdateAccountSettingsResponse, Error, UpdateAccountSettingsRequest>({
    mutationFn: async (settings) => {
      try {
        return await authedFetch<UpdateAccountSettingsResponse>("/user/account-settings", undefined, {
          method: "POST",
          data: settings,
        });
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Failed to update account settings");
      }
    },
    onSuccess: () => {
      // Invalidate session query to refetch user data
      queryClient.invalidateQueries({
        queryKey: ["session"],
      });
    },
  });
}
