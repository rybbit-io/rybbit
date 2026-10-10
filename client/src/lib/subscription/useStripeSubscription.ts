import { authClient } from "@/lib/auth";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { authedFetch } from "../../api/utils";
import { IS_CLOUD } from "../const";

export interface SubscriptionData {
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
  isOverride?: boolean;
  // Only on "free": false once the organization has had any subscription, so it is offered
  // plans instead of another trial (checkout skips the trial too).
  trialEligible?: boolean;
  memberLimit: number | null;
  siteLimit: number | null;
}

/** The subscription of `organizationId`, or of the active organization when omitted. */
export function useStripeSubscription(organizationId?: string): UseQueryResult<SubscriptionData | undefined, Error> {
  const { data: activeOrg } = authClient.useActiveOrganization();
  const orgId = organizationId ?? activeOrg?.id;

  const fetchSubscription = async () => {
    if (!orgId || !IS_CLOUD) {
      return undefined;
    }

    return authedFetch<SubscriptionData>(`/stripe/subscription?organizationId=${orgId}`);
  };

  return useQuery<SubscriptionData | undefined>({
    queryKey: ["stripe-subscription", orgId],
    queryFn: fetchSubscription,
    staleTime: 5 * 60 * 1000,
    retry: false,
    enabled: !!orgId,
  });
}
