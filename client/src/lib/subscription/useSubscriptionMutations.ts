import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useExtracted } from "next-intl";
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
  const t = useExtracted();

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
    onSuccess: async (_data, { organizationId }) => {
      // The server drops its Stripe cache in the same request, so refetching
      // everything derived from the plan updates the page in place: no reload,
      // and the toast survives. Returning this promise keeps the mutation
      // pending (mutateAsync unresolved) until the fresh data has landed.
      await Promise.all([
        // Billing page: plan card, usage cards, limits.
        queryClient.invalidateQueries({ queryKey: ["stripe-subscription", organizationId] }),
        // A mid-cycle change creates a prorated invoice.
        queryClient.invalidateQueries({ queryKey: ["stripe-invoices", organizationId] }),
        // Organization + plan summary behind feature gates (DisabledOverlay) and usage banners.
        queryClient.invalidateQueries({ queryKey: ["get-sites-from-org", organizationId] }),
      ]);
      toast.success(t("Subscription updated"));
    },
    onError: error => {
      toast.error(t("Subscription update failed: {message}", { message: error.message }));
    },
  });
}
