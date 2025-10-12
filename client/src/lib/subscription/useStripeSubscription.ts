import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth";
import { BACKEND_URL } from "../const";

interface SubscriptionData {
  id: string;
  planName: string;
  status: "expired" | "active" | "trialing" | "free";
  currentPeriodEnd: string;
  currentPeriodStart: string;
  createdAt: string;
  monthlyEventCount: number;
  eventLimit: number;
  interval: string;
  cancelAtPeriodEnd: boolean;
  isTrial?: boolean;
  trialDaysRemaining?: number;
  message?: string; // For expired trial message
  isPro?: boolean;
  appSumoPlan?: string;
}

export function useStripeSubscription() {
  const { data: activeOrg } = authClient.useActiveOrganization();

  const fetchSubscription = async () => {
    if (!activeOrg) {
      return null;
    }

    const response = await fetch(`${BACKEND_URL}/stripe/subscription?organizationId=${activeOrg.id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status === 401) {
        return null;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error: ${response.status}`);
      }
    }

    return await response.json();
  };

  const { data, isLoading, error, refetch } = useQuery<SubscriptionData>({
    queryKey: ["stripe-subscription", activeOrg?.id],
    queryFn: fetchSubscription,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
    enabled: !!activeOrg,
  });

  return { data, isLoading, error, refetch };
}
