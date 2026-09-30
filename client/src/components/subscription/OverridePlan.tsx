import { useExtracted } from "next-intl";
import { authClient } from "@/lib/auth";
import { getPlanType } from "@/lib/stripe";
import { useStripeSubscription } from "@/lib/subscription/useStripeSubscription";
import { InvoicesSection } from "./components/InvoicesSection";
import { PlanAllowances, PlanSection } from "./components/PlanSection";
import { UsageHistorySection } from "./components/UsageHistorySection";
import { UsageSection } from "./components/UsageSection";

function formatPlanName(name: string) {
  const eventMatch = name.match(/(\d+)(k|m)/i);
  if (!eventMatch) return name;

  const num = parseInt(eventMatch[1]);
  const unit = eventMatch[2].toLowerCase();
  const events = unit === "m" ? `${num}M` : `${num}K`;

  return `${getPlanType(name)} ${events}`;
}

export function OverridePlan() {
  const t = useExtracted();
  const { data: subscription } = useStripeSubscription();
  const { data: activeOrg } = authClient.useActiveOrganization();

  const organizationId = activeOrg?.id;

  if (!subscription) return null;

  const planName = formatPlanName(subscription.planName);
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
