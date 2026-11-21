import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateAccountSettings,
  UpdateAccountSettingsRequest,
  UpdateAccountSettingsResponse,
} from "../endpoints";

export function useUpdateAccountSettings() {
  const queryClient = useQueryClient();

  return useMutation<UpdateAccountSettingsResponse, Error, UpdateAccountSettingsRequest>({
    mutationFn: async (settings) => {
      try {
        return await updateAccountSettings(settings);
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
