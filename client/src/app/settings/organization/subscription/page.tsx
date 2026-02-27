"use client";

import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PaidPlan } from "../../../../components/subscription/PaidPlain/PaidPlan";
import { useStripeSubscription } from "../../../../lib/subscription/useStripeSubscription";
import { NoOrganization } from "../../../../components/NoOrganization";
import { ExpiredTrialPlan } from "../../../../components/subscription/ExpiredTrialPlan";
import { useSetPageTitle } from "../../../../hooks/useSetPageTitle";
import { FreePlan } from "../../../../components/subscription/FreePlan";
import { OverridePlan } from "../../../../components/subscription/OverridePlan";
import { CustomPlan } from "../../../../components/subscription/CustomPlan";
import { Building } from "lucide-react";
import { useExtracted } from "next-intl";
import { authClient } from "@/lib/auth";
import { useEffect } from "react";
import { AppSumoPlan } from "../../../../components/subscription/AppSumoPlan";

export default function OrganizationSubscriptionPage() {
  useSetPageTitle("Organization Subscription");
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

  // Check if the current user is an owner by looking at the members in the active organization
  const currentUserMember = activeOrg?.members?.find(member => member.userId === session?.user?.id);
  const isOwner = currentUserMember?.role === "owner";

  const isLoading = isLoadingSubscription || isPending;

  // Determine which plan to display
  const renderPlanComponent = () => {
    if (!activeOrg && !isPending) {
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
