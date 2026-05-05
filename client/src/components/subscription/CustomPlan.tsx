import { authClient } from "@/lib/auth";
import { Sparkles } from "lucide-react";
import { useExtracted } from "next-intl";
import { useStripeSubscription } from "../../lib/subscription/useStripeSubscription";
import { UsageChart } from "../UsageChart";
import { PlanCard } from "./components/PlanCard";
import { UsageLimitAlerts } from "./components/UsageLimitAlerts";
import { UsageCards } from "./components/UsageCards";
import { useUsageStats } from "./components/useUsageStats";

export function CustomPlan() {
  const t = useExtracted();
  const { data: subscription } = useStripeSubscription();
  const { data: activeOrg } = authClient.useActiveOrganization();

  const organizationId = activeOrg?.id;
  const { limit, isNearLimit, isLimitExceeded } = useUsageStats(subscription);

  if (!subscription) return null;

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
      <UsageCards />

      {organizationId && <UsageChart organizationId={organizationId} />}
    </PlanCard>
  );
}
