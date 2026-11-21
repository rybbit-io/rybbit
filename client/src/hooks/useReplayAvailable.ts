import { useGetSite } from "../api/admin/hooks/useSites";
import { useStripeSubscription } from "../lib/subscription/useStripeSubscription";
import { useAppEnv } from "./useIsProduction";

/**
 * Whether the current site has a Replay page to link to. This is the site
 * sidebar's rule for showing its Replay item (app/[site]/components/Sidebar):
 * web sites only, not on AppSumo plans, not on the demo, and not until the
 * subscription has loaded. Keep the two in step.
 *
 * The sidebar also hides the item below `md`; a link that relies on this hook
 * should do the same.
 */
export function useReplayAvailable(): boolean {
  const { data: site } = useGetSite();
  const { data: subscription, isLoading: isSubscriptionLoading } = useStripeSubscription();
  const appEnv = useAppEnv();

  return (
    site?.type !== "mobile" &&
    !subscription?.planName?.startsWith("appsumo") &&
    !isSubscriptionLoading &&
    appEnv !== "demo"
  );
}
