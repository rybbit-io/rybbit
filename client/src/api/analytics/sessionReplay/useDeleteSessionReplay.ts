import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useStore } from "../../../lib/store";
import { authedFetch } from "../../utils";

interface DeleteSessionReplayParams {
  sessionId: string;
}

export function useDeleteSessionReplay() {
  const { site } = useStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId }: DeleteSessionReplayParams) => {
      const response = await authedFetch<{ success: boolean }>(
        `/session-replay/${sessionId}/${site}`,
        {},
        {
          method: "DELETE",
        }
      );
      return response;
    },
    onSuccess: () => {
      // Invalidate the session replay list query to refetch data
      queryClient.invalidateQueries({ queryKey: ["session-replays", site] });
    },
  });
}
