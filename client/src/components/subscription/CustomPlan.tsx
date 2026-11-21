import { useExtracted } from "next-intl";
import { authClient } from "@/lib/auth";
import { useStripeSubscription } from "@/lib/subscription/useStripeSubscription";
import { InvoicesSection } from "./components/InvoicesSection";
import { PlanAllowances, PlanSection } from "./components/PlanSection";
import { UsageHistorySection } from "./components/UsageHistorySection";
import { UsageSection } from "./components/UsageSection";

export function CustomPlan() {
  const t = useExtracted();
  const { data: subscription } = useStripeSubscription();
  const { data: activeOrg } = authClient.useActiveOrganization();

  const organizationId = activeOrg?.id;

  if (!subscription) return null;

  const planName = t("Custom");
  const supportHint = t("Contact support if you need more capacity.");

  return (
    <>
      <PlanSection
        name={planName}
        description={t("Arranged with Rybbit. Contact support to change it.")}
        details={<PlanAllowances subscription={subscription} />}
      />
      <UsageSection
        subscription={subscription}
        planName={planName}
        nearLimitHint={supportHint}
        overLimitHint={supportHint}
      />
      {organizationId && <UsageHistorySection organizationId={organizationId} />}
      <InvoicesSection />
    </>
  );
}
