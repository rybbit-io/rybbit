import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useStore } from "../../../../lib/store";
import { deleteGoal } from "../../endpoints";

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  const { site } = useStore();

  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: async (goalId: number) => {
      return deleteGoal(site, goalId);
    },
    onSuccess: () => {
      // Invalidate goals query to refetch without the deleted goal
      queryClient.invalidateQueries({
        queryKey: ["goals", site],
      });
    },
  });
}
