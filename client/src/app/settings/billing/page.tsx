"use client";

import { useExtracted } from "next-intl";
import { useEffect } from "react";
import { NoOrganization } from "@/components/NoOrganization";
import { AppSumoPlan } from "@/components/subscription/AppSumoPlan";
import { CustomPlan } from "@/components/subscription/CustomPlan";
import { ExpiredTrialPlan } from "@/components/subscription/ExpiredTrialPlan";
import { FreePlan } from "@/components/subscription/FreePlan";
import { OverridePlan } from "@/components/subscription/OverridePlan";
import { PaidPlan } from "@/components/subscription/PaidPlain/PaidPlan";
import { Skeleton } from "@/components/ui/skeleton";
import { useCanInOrg } from "@/hooks/usePermissions";
import { useSetPageTitle } from "@/hooks/useSetPageTitle";
import { authClient } from "@/lib/auth";
import { useStripeSubscription } from "@/lib/subscription/useStripeSubscription";
import { LedgerRow, LedgerRows, LedgerSection } from "../components/Ledger";

function BillingSkeleton() {
  const t = useExtracted();
  return (
    <>
      <LedgerSection title={t("Plan")}>
        <LedgerRows>
          <LedgerRow label={t("Current plan")}>
            <div className="space-y-2 md:pt-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64" />
            </div>
          </LedgerRow>
        </LedgerRows>
      </LedgerSection>
      <LedgerSection title={t("Usage this month")}>
        <LedgerRows>
          <LedgerRow label={t("Events")}>
            <div className="space-y-3 md:pt-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-1.5 w-full" />
            </div>
          </LedgerRow>
          <LedgerRow label={t("Sites")}>
            <Skeleton className="h-4 w-24 md:mt-2" />
          </LedgerRow>
        </LedgerRows>
      </LedgerSection>
    </>
  );
}

export default function OrganizationBillingPage() {
  useSetPageTitle("Organization Billing");
  const t = useExtracted();
  const { data: activeSubscription, isLoading: isLoadingSubscription } = useStripeSubscription();

  const { data: activeOrg, isPending } = authClient.useActiveOrganization();
  const { data: session } = authClient.useSession();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("session_id") && session?.user?.email) {
      window.rewardful?.("convert", { email: session.user.email });
    }
  }, [session?.user?.email]);

  const canManageBilling = useCanInOrg("billing:manage", activeOrg?.id);

  const isLoading = isLoadingSubscription || isPending;

  if (isLoading) {
    return <BillingSkeleton />;
  }

  if (!activeOrg && !isPending) {
    return <NoOrganization message={t("You need to select an organization to manage your subscription.")} />;
  }

  if (!canManageBilling) {
    return (
      <LedgerSection title={t("Plan")}>
        <LedgerRows>
          <LedgerRow label={t("Not an owner")}>
            <p className="text-sm text-neutral-700 md:pt-2 dark:text-neutral-300">
              {t("Only the owner of the organization can manage the subscription.")}
            </p>
          </LedgerRow>
        </LedgerRows>
      </LedgerSection>
    );
  }

  if (!activeSubscription) {
    return <ExpiredTrialPlan />;
  }

  // Check if trial expired
  if (activeSubscription.status === "expired") {
    return <ExpiredTrialPlan message={activeSubscription.message} />;
  }

  // Check if user is on free plan
  if (activeSubscription.status === "free") {
    return <FreePlan />;
  }

  if (activeSubscription.planName === "custom") {
    return <CustomPlan />;
  }

  if (activeSubscription.planName.startsWith("appsumo")) {
    return <AppSumoPlan />;
  }

  if (activeSubscription.isOverride) {
    return <OverridePlan />;
  }

  return <PaidPlan />;
}
