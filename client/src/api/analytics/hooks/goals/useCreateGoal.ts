import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createGoal } from "../../endpoints";

export interface CreateGoalRequest {
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
    },
  });
}
