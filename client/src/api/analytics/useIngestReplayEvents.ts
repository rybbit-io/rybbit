import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BACKEND_URL } from "../../lib/const";
import { authedFetchWithError } from "../utils";

export interface IngestReplayEventsRequest {
  site_id: number;
  session_id: string;
  user_id?: string;
  events: any[]; // rrweb events can have various structures
  is_complete?: boolean;
  timestamp: string;
}

interface IngestReplayEventsResponse {
  success: boolean;
}

export function useIngestReplayEvents() {
  const queryClient = useQueryClient();

  return useMutation<
    IngestReplayEventsResponse,
    Error,
    IngestReplayEventsRequest
  >({
    mutationFn: async (eventData) => {
      try {
        return await authedFetchWithError<IngestReplayEventsResponse>(
          `${BACKEND_URL}/replay/ingest`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(eventData),
          }
        );
      } catch (error) {
        throw new Error(
          error instanceof Error
            ? error.message
            : "Failed to ingest replay events"
        );
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate replay sessions query to refetch with the new data
      queryClient.invalidateQueries({
        queryKey: ["replay-sessions", variables.site_id.toString()],
      });

      // Also invalidate the specific session if it exists
      if (variables.session_id) {
        queryClient.invalidateQueries({
          queryKey: [
            "replay-session",
            variables.site_id.toString(),
            variables.session_id,
          ],
        });
      }
    },
  });
}
