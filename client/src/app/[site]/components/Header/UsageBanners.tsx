import { AlertTriangle, ArrowRight } from "lucide-react";
import { useExtracted } from "next-intl";
import Link from "next/link";
import { useCurrentSite } from "../../../../api/admin/hooks/useSites";
import { Button } from "../../../../components/ui/button";

export function UsageBanners() {
  const t = useExtracted();
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

  if (
    subscription?.monthlyEventCount &&
    subscription?.eventLimit &&
    subscription.monthlyEventCount > subscription.eventLimit
  ) {
    return (
      <div className="mt-4 px-4 py-3 rounded-lg border border-red-300 dark:border-red-400/30 bg-red-100/80 dark:bg-red-900/20 text-sm flex gap-4 items-center">
        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
        <div className="flex-1">
          <span className="text-red-700 dark:text-red-300 font-medium">
            {t("Monthly event limit exceeded:")} <strong>{formatNumber(subscription.monthlyEventCount || 0)}</strong> {t("of")}{" "}
            <strong>{formatNumber(subscription.eventLimit)}</strong> {t("events used.")}{" "}
            {site.isOwner
              ? t("Upgrade your plan to continue collecting analytics.")
              : t("Please contact your organization owner to upgrade.")}
          </span>
        </div>
        {site.isOwner && (
          <Button variant="success" size="sm" asChild>
            <Link href="/settings/organization/subscription">
              {t("Upgrade")} <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        )}
      </div>
    );
  }

  // Approaching limit (90-100%)
  if (usagePercentage >= 90) {
    return (
      <div className="mt-4 px-4 py-3 rounded-lg border border-amber-300 dark:border-amber-400/30 bg-amber-100/80 dark:bg-amber-900/20 text-sm flex gap-4 items-center">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
        <div className="flex-1">
          <span className="text-amber-700 dark:text-amber-300 font-medium">
            {t("Approaching monthly event limit:")} <strong>{formatNumber(subscription?.monthlyEventCount || 0)}</strong> {t("of")}{" "}
            <strong>{formatNumber(subscription?.eventLimit || 0)}</strong> {t("events used.")}{" "}
            {site.isOwner
              ? t("Consider upgrading to avoid interruptions.")
              : t("You may want to notify your organization owner.")}
          </span>
        </div>
        {site.isOwner && (
          <Button variant="success" size="sm" asChild>
            <Link href="/settings/organization/subscription">
              {t("Upgrade")} <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        )}
      </div>
    );
  }

  // If not near limit, don't show any banner
  return null;
}
