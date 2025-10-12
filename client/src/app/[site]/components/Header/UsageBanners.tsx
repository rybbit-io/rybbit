import { AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useCurrentSite } from "../../../../api/admin/sites";
import { Alert, AlertDescription, AlertTitle } from "../../../../components/ui/alert";
import { Button } from "../../../../components/ui/button";

export function UsageBanners() {
  const { site, subscription } = useCurrentSite();

  if (!site) return null;

  // Format numbers with commas
  const formatNumber = (num: number = 0) => {
    return num.toLocaleString();
  };

  // Calculate usage percentage
  const getUsagePercentage = () => {
    if (!subscription?.eventLimit || !subscription.monthlyEventCount) return 0;
    return (subscription.monthlyEventCount / subscription.eventLimit) * 100;
  };

  const usagePercentage = getUsagePercentage();
  const isNearLimit = usagePercentage >= 90 && !subscription?.overMonthlyLimit;

  if (
    subscription?.monthlyEventCount &&
    subscription?.eventLimit &&
    subscription.monthlyEventCount > subscription.eventLimit
  ) {
    return (
      <Alert variant="destructive" className="p-4 mt-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 mt-0.5" />
          <div className="flex-1">
            <AlertTitle className="text-base font-semibold mb-1">Event Limit Exceeded</AlertTitle>
            <div className="mb-2 text-sm">
              <strong>{formatNumber(subscription.monthlyEventCount || 0)}</strong> events used of{" "}
              <strong>{formatNumber(subscription.eventLimit)}</strong>
            </div>

            {site.isOwner ? (
              <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 items-start sm:items-center">
                <AlertDescription className="text-sm">
                  Upgrade your plan to continue collecting analytics.
                </AlertDescription>
                <Button variant="success" asChild size="sm">
                  <Link href="/subscribe">
                    Upgrade Plan <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            ) : (
              <AlertDescription className="text-sm">
                This site has exceeded its monthly event limit. Please contact your organization owner to upgrade the
                plan.
              </AlertDescription>
            )}
          </div>
        </div>
      </Alert>
    );
  }

  // If approaching limit (>90%), show warning banner
  if (isNearLimit) {
    return (
      <Alert className="mt-4 p-4 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 mt-0.5 text-amber-500" />
          <div className="flex-1">
            <AlertTitle className="text-base font-semibold mb-1 text-amber-700 dark:text-amber-400">
              Approaching Event Limit
            </AlertTitle>
            <div className="mb-2 text-sm text-amber-700 dark:text-amber-400">
              <strong>{formatNumber(subscription?.monthlyEventCount || 0)}</strong> events used of{" "}
              <strong>{formatNumber(subscription?.eventLimit || 0)}</strong>
            </div>

            {site.isOwner ? (
              <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 items-start sm:items-center">
                <AlertDescription className="text-sm text-amber-700 dark:text-amber-400">
                  Consider upgrading your plan to avoid interruptions.
                </AlertDescription>
                <Button asChild variant="success" size="sm">
                  <Link href="/subscribe">
                    Upgrade Plan <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            ) : (
              <AlertDescription className="text-sm text-amber-700 dark:text-amber-400">
                This site is approaching its monthly event limit. You may want to notify your organization owner.
              </AlertDescription>
            )}
          </div>
        </div>
      </Alert>
    );
  }

  // If not near limit, don't show any banner
  return null;
}
