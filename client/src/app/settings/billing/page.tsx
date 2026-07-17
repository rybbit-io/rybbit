"use client";

import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PaidPlan } from "../../../components/subscription/PaidPlain/PaidPlan";
import { useStripeSubscription } from "../../../lib/subscription/useStripeSubscription";
import { NoOrganization } from "../../../components/NoOrganization";
import { ExpiredTrialPlan } from "../../../components/subscription/ExpiredTrialPlan";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { FreePlan } from "../../../components/subscription/FreePlan";
import { OverridePlan } from "../../../components/subscription/OverridePlan";
import { CustomPlan } from "../../../components/subscription/CustomPlan";
import { Building } from "lucide-react";
import { useExtracted } from "next-intl";
import { useUserOrganizations } from "../../../api/admin/hooks/useOrganizations";
import { useActiveOrganizationId } from "../../../hooks/useActiveOrganizationId";
import { authClient } from "@/lib/auth";
import { useEffect } from "react";
import { AppSumoPlan } from "../../../components/subscription/AppSumoPlan";

export default function OrganizationBillingPage() {
  useSetPageTitle("Organization Billing");
  const t = useExtracted();
  const { data: activeSubscription, isLoading: isLoadingSubscription } = useStripeSubscription();

  // Resolve the org and the current user's role from the lightweight
  // /user/organizations rather than the heavy get-full-organization call, so
  // the page doesn't hang on its loading state. See useActiveOrganizationId.
  const activeOrganizationId = useActiveOrganizationId();
  const { data: organizations, isLoading: isLoadingOrganizations } = useUserOrganizations();
  const { data: session } = authClient.useSession();

  const activeOrg = organizations?.find(org => org.id === activeOrganizationId) ?? organizations?.[0];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("session_id") && session?.user?.email) {
      window.rewardful?.("convert", { email: session.user.email });
    }
  }, [session?.user?.email]);

  // The user's role in the active org comes from /user/organizations.
  const isOwner = activeOrg?.role === "owner";

  const isLoading = isLoadingSubscription || isLoadingOrganizations;

  // Determine which plan to display
  const renderPlanComponent = () => {
    if (!activeOrg && !isLoadingOrganizations) {
      return <NoOrganization message={t("You need to select an organization to manage your subscription.")} />;
    }

    if (!isOwner) {
      return (
        <Card className="p-6 flex flex-col items-center text-center w-full">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Building className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="mb-2 text-xl">{t("Not an owner")}</CardTitle>
          <CardDescription className="mb-6">
            {t("Only the owner of the organization can manage the subscription.")}
          </CardDescription>
        </Card>
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
  };

  return (
    <div className="space-y-6">
      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-20 w-full mt-4" />
            </div>
          </CardContent>
        </Card>
      ) : (
        renderPlanComponent()
      )}
    </div>
  );
}
