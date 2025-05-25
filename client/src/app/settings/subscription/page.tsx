"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProPlan } from "./components/ProPlan";
import { useStripeSubscription } from "./utils/useStripeSubscription";
import { useUserOrganizations } from "../../../api/admin/organizations";
import { NoOrganization } from "../../../components/NoOrganization";
import { TrialPlan } from "./components/TrialPlan";
import { ExpiredTrialPlan } from "./components/ExpiredTrialPlan";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { FreePlan } from "./components/FreePlan";

export default function SubscriptionPage() {
  useSetPageTitle("Rybbit · Subscription");
  const { data: activeSubscription, isLoading: isLoadingSubscription } =
    useStripeSubscription();

  const { data: organizations, isLoading: isLoadingOrganizations } =
    useUserOrganizations();

  const hasOrganization = !!organizations?.length;

  const isLoading = isLoadingSubscription || isLoadingOrganizations;

  // Determine which plan to display
  const renderPlanComponent = () => {
    if (!hasOrganization) {
      return (
        <NoOrganization message="You need to be part of an organization to manage your subscription." />
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

    if (activeSubscription.isTrial) {
      return <TrialPlan />;
    }

    return <ProPlan />;
  };

  return (
    <div className="py-2">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscription</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage your subscription and billing information
          </p>
        </div>
      </div>

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
