import { AlertTriangle, ArrowRight, Clock } from "lucide-react";
import { useExtracted } from "next-intl";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import { useStripeSubscription } from "../lib/subscription/useStripeSubscription";
import { DEFAULT_EVENT_LIMIT } from "../lib/subscription/constants";

export function FreeTrialBanner() {
  const t = useExtracted();
  const { data: subscription } = useStripeSubscription();

  // Don't show the banner if no subscription data or if there's a paid subscription
  if (!subscription) {
    return null;
  }

  // Format numbers with commas
  const formatNumber = (num: number = 0) => {
    return num.toLocaleString();
  };

  // Active trial banner - slightly more visible but still minimal
  if (subscription.isTrial) {
    const daysRemaining = subscription.trialDaysRemaining || 0;
    const eventLimit = subscription.eventLimit || DEFAULT_EVENT_LIMIT;
    const eventsUsed = subscription.monthlyEventCount || 0;

    return (
      <div className="mt-4 px-4 py-3 rounded-lg border border-blue-100 dark:border-blue-400/30 bg-blue-50/80 dark:bg-blue-900/20 text-sm flex justify-between items-center">
        <div className="text-blue-700 dark:text-blue-300 flex items-center font-medium">
          <Clock className="h-4 w-4 mr-2 text-blue-500 dark:text-blue-400 shrink-0" />
          <span>
            {t("Free trial: {days} days remaining – Using {used} of {limit} events", { days: String(daysRemaining), used: formatNumber(eventsUsed), limit: formatNumber(eventLimit) })}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-7 px-3 text-blue-600 hover:text-blue-700 hover:bg-blue-100/60 dark:text-blue-300 dark:hover:text-blue-200 dark:hover:bg-blue-800/30 border-blue-200 dark:border-blue-800/50"
          asChild
        >
          <Link href="/subscribe">
            {t("Upgrade")} <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </div>
    );
  }

  // Trial expired banner - keep prominent
  if (subscription.status === "expired") {
    return (
      <Alert className="mt-4 p-4 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 mt-0.5 text-amber-500 dark:text-amber-400" />
          <div className="flex-1">
            <AlertTitle className="text-base font-semibold mb-1 text-amber-700 dark:text-amber-400">
              {t("Your Free Trial Has Ended")}
            </AlertTitle>
            <div className="mb-2 text-sm text-amber-700 dark:text-amber-400">
              {t("Your 14-day free trial has expired. Subscribe to continue tracking visits again.")}
            </div>

            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 items-start sm:items-center">
              <AlertDescription className="text-sm text-amber-700 dark:text-amber-400">
                {t("Choose a subscription plan to continue collecting analytics data.")}
              </AlertDescription>
              <Button
                className="bg-amber-500 hover:bg-amber-600 text-white border-amber-400 hover:border-amber-500 py-1 h-auto text-sm"
                asChild
              >
                <Link href="/subscribe">
                  {t("Subscribe Now")} <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Alert>
    );
  }

  return null;
}
