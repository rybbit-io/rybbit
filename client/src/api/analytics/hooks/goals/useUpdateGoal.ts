import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useStore } from "../../../../lib/store";
import { GoalConfig, GoalType, updateGoal } from "../../endpoints";

export interface UpdateGoalRequest {
  goalId: number;
  siteId: number;
  name?: string;
  goalType: GoalType;
  config: GoalConfig;
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
        siteId: goalData.siteId,
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
      queryClient.invalidateQueries({
        queryKey: ["goal-time-series", site],
      });
    },
  });
}
