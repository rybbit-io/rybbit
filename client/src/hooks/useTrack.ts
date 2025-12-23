import { useEffect } from "react";
import { authClient } from "@/lib/auth";
import { useStripeSubscription } from "../lib/subscription/useStripeSubscription";
import { useGetSitesFromOrg } from "../api/admin/sites";

export function useTrack() {
  const { data: subscription, isLoading } = useStripeSubscription();
  const { data: activeOrganization, isPending: isPendingActiveOrganization } = authClient.useActiveOrganization();
  const {
    data: sites,
    isPending: isPendingSites,
    isLoading: isLoadingSites,
  } = useGetSitesFromOrg(activeOrganization?.id);

  const user = authClient.useSession();
  useEffect(() => {
    if (typeof window !== "undefined" && user.data?.user?.id && window?.rybbit && !isLoading && !isLoadingSites) {
      window.rybbit?.identify(user.data?.user?.id, {
        email: user.data?.user?.email,
        name: user.data?.user?.name,
        plan: subscription?.planName,
        organization: activeOrganization?.name,
        sites: sites?.sites.map(site => site.domain),
      });
    }
  }, [user.data?.user?.id, subscription?.planName, isLoading, isPendingActiveOrganization, isPendingSites]);
}
