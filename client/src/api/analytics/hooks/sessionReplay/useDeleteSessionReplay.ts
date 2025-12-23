import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useStore } from "../../../../lib/store";
import { deleteSessionReplay } from "../../endpoints";

interface DeleteSessionReplayParams {
  sessionId: string;
}

export function useDeleteSessionReplay() {
  const { site } = useStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId }: DeleteSessionReplayParams) => {
      return deleteSessionReplay(site, sessionId);
    },
    onSuccess: () => {
      // Invalidate the session replay list query to refetch data
      queryClient.invalidateQueries({ queryKey: ["session-replays", site] });
    },
  });
}
