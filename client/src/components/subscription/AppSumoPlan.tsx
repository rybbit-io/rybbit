import { authClient } from "@/lib/auth";
import { ArrowRight } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { useStripeSubscription } from "../../lib/subscription/useStripeSubscription";
import { Button } from "../ui/button";
import { UsageChart } from "../UsageChart";
import { PlanCard } from "./components/PlanCard";
import { PlanDialog } from "./components/PlanDialog";
import { UsageLimitAlerts } from "./components/UsageLimitAlerts";
import { UsageCards } from "./components/UsageCards";
import { useUsageStats } from "./components/useUsageStats";

export function AppSumoPlan() {
  const t = useExtracted();
  const { data: subscription } = useStripeSubscription();
  const { data: activeOrg } = authClient.useActiveOrganization();
  const [showPlanDialog, setShowPlanDialog] = useState(false);

  const organizationId = activeOrg?.id;
  const { isNearLimit, isLimitExceeded } = useUsageStats(subscription);

  if (!subscription) return null;

  return (
    <PlanCard
      title={t("AppSumo Plan Tier {tier}", { tier: subscription.planName.split("-")[1] })}
      description={t("You are on the AppSumo lifetime plan with up to {limit} events per month.", { limit: subscription?.eventLimit.toLocaleString() })}
      footer={
        <Button onClick={() => setShowPlanDialog(true)} variant={"success"}>
          {t("Upgrade To Pro")} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      }
    >
      <UsageLimitAlerts
        isLimitExceeded={isLimitExceeded}
        isNearLimit={isNearLimit}
        exceededMessage={t("You have exceeded your monthly event limit. Please upgrade to a Pro plan to continue collecting analytics.")}
      />
      <UsageCards />
      {organizationId && <UsageChart organizationId={organizationId} />}
      <PlanDialog
        open={showPlanDialog}
        onOpenChange={setShowPlanDialog}
        hasActiveSubscription={false}
      />
    </PlanCard>
  );
}
