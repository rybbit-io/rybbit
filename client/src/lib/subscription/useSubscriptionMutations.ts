import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BACKEND_URL } from "../const";
import { toast } from "@/components/ui/sonner";

interface PreviewSubscriptionParams {
  organizationId: string;
  newPriceId: string;
}

interface PreviewSubscriptionResponse {
  success: boolean;
  preview: {
    currentPlan: {
      priceId: string;
      amount: number;
      interval: string;
    };
    newPlan: {
      priceId: string;
      amount: number;
      interval: string;
    };
    proration: {
      credit: number;
      charge: number;
      immediatePayment: number;
      nextBillingDate: string | null;
    };
  };
}

interface UpdateSubscriptionParams {
  organizationId: string;
  newPriceId: string;
}

interface UpdateSubscriptionResponse {
  success: boolean;
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd: string;
  };
}

export function usePreviewSubscriptionUpdate() {
  return useMutation<PreviewSubscriptionResponse, Error, PreviewSubscriptionParams>({
    mutationFn: async ({ organizationId, newPriceId }) => {
      const response = await fetch(`${BACKEND_URL}/stripe/preview-subscription-update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          organizationId,
          newPriceId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to preview subscription update");
      }

      return data;
    },
  });
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient();

  return useMutation<UpdateSubscriptionResponse, Error, UpdateSubscriptionParams>({
    mutationFn: async ({ organizationId, newPriceId }) => {
      const response = await fetch(`${BACKEND_URL}/stripe/update-subscription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          organizationId,
          newPriceId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update subscription");
      }

      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate subscription data to refetch latest info
      queryClient.invalidateQueries({ queryKey: ["stripe-subscription", variables.organizationId] });
      toast.success("Subscription updated successfully!");
    },
    onError: error => {
      toast.error(`Subscription update failed: ${error.message}`);
    },
  });
}
