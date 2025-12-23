import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useStore } from "../../../../lib/store";
import { updateGoal } from "../../endpoints";

export interface UpdateGoalRequest {
  goalId: number;
  siteId: number;
  name?: string;
  goalType: "path" | "event";
  config: {
    pathPattern?: string;
    eventName?: string;
    eventPropertyKey?: string;
    eventPropertyValue?: string | number | boolean;
  };
}

interface UpdateGoalResponse {
  success: boolean;
  goalId: number;
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  const { site } = useStore();

  return useMutation<UpdateGoalResponse, Error, UpdateGoalRequest>({
    mutationFn: async goalData => {
      return updateGoal(goalData.siteId, {
        goalId: goalData.goalId,
        name: goalData.name,
        goalType: goalData.goalType,
        config: goalData.config,
      });
    },
    onSuccess: () => {
      // Invalidate goals query to refetch with the updated goal
      queryClient.invalidateQueries({
        queryKey: ["goals", site],
      });
    },
  });
}
