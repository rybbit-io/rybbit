import { useMutation } from "@tanstack/react-query";
import { BACKEND_URL } from "../const";

interface SubmitCancellationFeedbackParams {
  organizationId: string;
  reason: string;
  reasonDetails?: string;
  retentionOfferShown?: string;
  retentionOfferAccepted?: boolean;
  outcome: string;
  planNameAtCancellation?: string;
  monthlyEventCountAtCancellation?: number;
}

export function useSubmitCancellationFeedback() {
  return useMutation<{ success: boolean }, Error, SubmitCancellationFeedbackParams>({
    mutationFn: async (params) => {
      const response = await fetch(`${BACKEND_URL}/stripe/cancellation-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit cancellation feedback");
      }

      return data;
    },
  });
}
