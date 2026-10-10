import { ArrowRight } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { authClient } from "@/lib/auth";
import { useStripeSubscription } from "@/lib/subscription/useStripeSubscription";
import { Button } from "../ui/button";
import { InvoicesSection } from "./components/InvoicesSection";
import { PlanDialog } from "./components/PlanDialog";
import { PlanAllowances, PlanSection } from "./components/PlanSection";
import { UsageHistorySection } from "./components/UsageHistorySection";
import { UsageSection } from "./components/UsageSection";

export function FreePlan() {
  const t = useExtracted();
  const { data: subscription } = useStripeSubscription();
  const { data: activeOrg } = authClient.useActiveOrganization();
  const [showPlanDialog, setShowPlanDialog] = useState(false);

  const organizationId = activeOrg?.id;

  if (!subscription) return null;

  const planName = t("Free");

  return (
    <>
      <PlanDialog open={showPlanDialog} onOpenChange={setShowPlanDialog} hasActiveSubscription={false} />
      <PlanSection
        name={planName}
        details={<PlanAllowances subscription={subscription} />}
        action={
          <Button onClick={() => setShowPlanDialog(true)} variant="success">
            {t("Upgrade to Pro")} <ArrowRight className="h-4 w-4" />
          </Button>
        }
      />
      <UsageSection
        subscription={subscription}
        planName={planName}
        nearLimitHint={t("Consider upgrading to a paid plan for higher limits.")}
        overLimitHint={t("Upgrade to a Pro plan to continue collecting analytics.")}
      />
      {organizationId && <UsageHistorySection organizationId={organizationId} />}
      <InvoicesSection />
    </>
  );
}
