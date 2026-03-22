import { authClient } from "@/lib/auth";
import { Sparkles } from "lucide-react";
import { useExtracted } from "next-intl";
import { useStripeSubscription } from "../../lib/subscription/useStripeSubscription";
import { UsageChart } from "../UsageChart";
import { PlanCard } from "./components/PlanCard";
import { UsageLimitAlerts } from "./components/UsageLimitAlerts";
import { UsageProgressBar } from "./components/UsageProgressBar";
import { useUsageStats } from "./components/useUsageStats";

export function CustomPlan() {
  const t = useExtracted();
  const { data: subscription } = useStripeSubscription();
  const { data: activeOrg } = authClient.useActiveOrganization();

  const organizationId = activeOrg?.id;
  const { currentUsage, limit, percentageUsed, isNearLimit, isLimitExceeded } = useUsageStats(subscription);

  if (!subscription) return null;

  const formatLimit = (value: number | null) => (value === null ? t("Unlimited") : value.toLocaleString());

  return (
    <PlanCard
      title={
        <>
          <Sparkles className="h-5 w-5" />
          {t("Custom Plan")}
        </>
      }
      description={t("You have a custom plan with up to {limit} pageviews per month.", {
        limit: limit.toLocaleString(),
      })}
    >
      <UsageLimitAlerts
        isLimitExceeded={isLimitExceeded}
        isNearLimit={isNearLimit}
        exceededMessage={t("You have exceeded your monthly event limit. Please contact support for assistance.")}
        nearLimitMessage={t("You are approaching your monthly event limit. Please contact support if you need more capacity.")}
      />
      <UsageProgressBar
        currentUsage={currentUsage}
        limit={limit}
        percentageUsed={percentageUsed}
        isNearLimit={isNearLimit}
      />

      <div className="space-y-2">
        <h3 className="font-medium mb-2">{t("Plan Limits")}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border p-3">
            <div className="text-sm text-muted-foreground">{t("Websites")}</div>
            <div className="text-lg font-semibold">{formatLimit(subscription.siteLimit)}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-sm text-muted-foreground">{t("Team Members")}</div>
            <div className="text-lg font-semibold">{formatLimit(subscription.memberLimit)}</div>
          </div>
        </div>
      </div>

      {organizationId && <UsageChart organizationId={organizationId} />}
    </PlanCard>
  );
}
