import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authedFetch } from "../../utils";

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
    mutationFn: async (goalData) => {
      try {
        return await authedFetch<CreateGoalResponse>(
          "/goal/create",
          undefined,
          {
            method: "POST",
            data: goalData,
          }
        );
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "Failed to create goal"
        );
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate goals query to refetch with the new goal
      queryClient.invalidateQueries({
        queryKey: ["goals", variables.siteId.toString()],
      });
    },
  });
}
