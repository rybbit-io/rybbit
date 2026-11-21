import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useStore } from "../../../../lib/store";
import { deleteFunnel } from "../../endpoints";

/**
 * Hook for deleting a saved funnel report
 */
export function useDeleteFunnel() {
  const queryClient = useQueryClient();
  const { site } = useStore();

  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: async reportId => {
      return deleteFunnel(site, reportId);
    },
    onSuccess: () => {
      // Invalidate the funnels query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["funnels"] });
    },
  });
}
