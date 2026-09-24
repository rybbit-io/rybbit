import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createGoal, GoalConfig, GoalType } from "../../endpoints";

export interface CreateGoalRequest {
  siteId: number;
  name?: string;
  goalType: GoalType;
  config: GoalConfig;
}

interface CreateGoalResponse {
  success: boolean;
  goalId: number;
}

export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation<CreateGoalResponse, Error, CreateGoalRequest>({
    mutationFn: async goalData => {
      return createGoal(goalData.siteId, {
        name: goalData.name,
        goalType: goalData.goalType,
        config: goalData.config,
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate goals query to refetch with the new goal
      queryClient.invalidateQueries({
        queryKey: ["goals", variables.siteId.toString()],
      });
      queryClient.invalidateQueries({
        queryKey: ["goal-time-series", variables.siteId.toString()],
      });
    },
  });
}
