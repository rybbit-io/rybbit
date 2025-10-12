import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authedFetch } from "../../utils";
import { useStore } from "../../../lib/store";

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
      try {
        return await authedFetch<UpdateGoalResponse>("/goal/update", undefined, {
          method: "PUT",
          data: goalData,
        });
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Failed to update goal");
      }
    },
    onSuccess: () => {
      // Invalidate goals query to refetch with the updated goal
      queryClient.invalidateQueries({
        queryKey: ["goals", site],
      });
    },
  });
}
