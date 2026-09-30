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

export class SubscriptionRefreshError extends Error {}

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

  const refreshSubscription = async (organizationId: string) => {
    const queryKeys = [
      ["stripe-subscription", organizationId],
      ["stripe-invoices", organizationId],
      ["get-sites-from-org", organizationId],
    ];
    try {
      await Promise.all(queryKeys.map(queryKey => queryClient.invalidateQueries({ queryKey }, { throwOnError: true })));
      // TanStack resolves paused refetches even with throwOnError enabled.
      const paused = queryKeys.some(queryKey =>
        queryClient.getQueryCache().findAll({ queryKey, type: "active" }).some(query => query.state.fetchStatus === "paused")
      );
      if (paused) throw new Error(t("Billing refresh is paused while offline."));
    } catch (error) {
      throw new SubscriptionRefreshError(error instanceof Error ? error.message : String(error));
    }
  };

  const reportRefreshError = (error: Error) => {
    toast.error(t("Your subscription was updated, but refreshing billing data failed: {message}", { message: error.message }));
  };

  const mutation = useMutation<UpdateSubscriptionResponse, Error, UpdateSubscriptionParams>({
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
      await refreshSubscription(organizationId);
      toast.success(t("Subscription updated"));
    },
    onError: error => {
      if (error instanceof SubscriptionRefreshError) {
        reportRefreshError(error);
      } else {
        toast.error(t("Subscription update failed: {message}", { message: error.message }));
      }
    },
  });

  const retryRefresh = async () => {
    if (!mutation.variables || !(mutation.error instanceof SubscriptionRefreshError)) return false;
    try {
      await refreshSubscription(mutation.variables.organizationId);
      toast.success(t("Subscription updated"));
      mutation.reset();
      return true;
    } catch (error) {
      reportRefreshError(error as SubscriptionRefreshError);
      return false;
    }
  };

  return { ...mutation, retryRefresh };
}
