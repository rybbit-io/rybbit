import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authedFetch } from "../../utils";

/**
 * Hook for deleting a saved funnel report
 */
export function useDeleteFunnel() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: async reportId => {
      try {
        return await authedFetch<{ success: boolean }>(`/funnel/${reportId}`, undefined, {
          method: "DELETE",
        });
      } catch (error) {
        console.error(error);
        throw new Error("Failed to delete funnel");
      }
    },
    onSuccess: () => {
      // Invalidate the funnels query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["funnels"] });
    },
  });
}
