import { authClient } from "@/lib/auth";
import { Shield } from "lucide-react";
import { useExtracted } from "next-intl";
import { useStripeSubscription } from "../../lib/subscription/useStripeSubscription";
import { UsageChart } from "../UsageChart";
import { getPlanType } from "../../lib/stripe";
import { PlanCard } from "./components/PlanCard";
import { UsageLimitAlerts } from "./components/UsageLimitAlerts";
import { UsageCards } from "./components/UsageCards";
import { useUsageStats } from "./components/useUsageStats";

export function OverridePlan() {
  const t = useExtracted();
  const { data: subscription } = useStripeSubscription();
  const { data: activeOrg } = authClient.useActiveOrganization();

  const organizationId = activeOrg?.id;
  const { isNearLimit, isLimitExceeded } = useUsageStats(subscription);

  if (!subscription) return null;

  const formatPlanName = (name: string) => {
    const eventMatch = name.match(/(\d+)(k|m)/i);
    if (!eventMatch) return name;

    const num = parseInt(eventMatch[1]);
    const unit = eventMatch[2].toLowerCase();
    const events = unit === "m" ? `${num}M` : `${num}K`;

    return `${getPlanType(name)} ${events}`;
  };

  return (
    <PlanCard
      title={
        <>
          <Shield className="h-5 w-5" />
          {t("{plan} Plan", { plan: formatPlanName(subscription.planName) })}
        </>
      }
      description={t("You have a custom plan with up to {limit} pageviews per month.", { limit: subscription?.eventLimit.toLocaleString() })}
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
