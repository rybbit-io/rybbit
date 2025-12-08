import { Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DateTime } from "luxon";
import { Alert } from "../../ui/alert";
import { Button } from "../../ui/button";
import { Card, CardContent } from "../../ui/card";
import { Progress } from "../../ui/progress";
import { BACKEND_URL } from "../../../lib/const";
import { getStripePrices } from "../../../lib/stripe";
import { formatDate } from "../../../lib/subscription/planUtils";
import { useStripeSubscription } from "../../../lib/subscription/useStripeSubscription";
import { UsageChart } from "../../UsageChart";
import { authClient } from "@/lib/auth";
import { PlanDialog } from "./PlanDialog";

export function PaidPlan() {
  const { data: activeSubscription, isLoading, error: subscriptionError, refetch } = useStripeSubscription();

  const { data: activeOrg } = authClient.useActiveOrganization();

  // Get the active organization ID
  const organizationId = activeOrg?.id;

  // Get last 30 days of data for the chart
  const endDate = DateTime.now().toISODate();
  const startDate = DateTime.now().minus({ days: 30 }).toISODate();

  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showPlanDialog, setShowPlanDialog] = useState(false);

  const eventLimit = activeSubscription?.eventLimit || 0;
  const currentUsage = activeSubscription?.monthlyEventCount || 0;
  const usagePercentage = eventLimit > 0 ? Math.min((currentUsage / eventLimit) * 100, 100) : 0;
  const isAnnualPlan = activeSubscription?.interval === "year";

  const stripePlan = getStripePrices().find(p => p.name === activeSubscription?.planName);

  const isPro = activeSubscription?.planName?.startsWith("pro");

  const currentPlanDetails = activeSubscription
    ? {
        id: isPro ? "pro" : "standard",
        name: isPro ? "Pro" : "Standard",
        price: `$${stripePlan?.price}`,
        interval: stripePlan?.interval,
        description: isPro ? "Premium features for professional teams" : "Advanced analytics for growing projects",
        features: isPro
          ? [
              "5+ year data retention",
              "Session replays",
              "Unlimited team members",
              "Unlimited websites",
              "Priority support",
            ]
          : ["1 year data retention", "Standard support", "Core analytics features"],
        color: isPro
          ? "bg-linear-to-br from-purple-50 to-indigo-100 dark:from-purple-800 dark:to-indigo-800"
          : "bg-linear-to-br from-green-50 to-emerald-100 dark:from-green-800 dark:to-emerald-800",
        icon: <Shield className="h-5 w-5" />,
      }
    : null;

  const createPortalSession = async (flowType?: string) => {
    if (!organizationId) {
      toast.error("No organization selected");
      return;
    }

    setActionError(null);
    setIsProcessing(true);
    try {
      const response = await fetch(`${BACKEND_URL}/stripe/create-portal-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          returnUrl: window.location.href,
          organizationId,
          flowType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create portal session.");
      }

      if (data.portalUrl) {
        window.location.href = data.portalUrl;
      } else {
        throw new Error("Portal URL not received.");
      }
    } catch (err: any) {
      console.error("Portal Session Error:", err);
      setActionError(err.message || "Could not open billing portal.");
      toast.error(`Error: ${err.message || "Could not open billing portal."}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChangePlan = () => setShowPlanDialog(true);
  const handleViewSubscription = () => createPortalSession();
  const handleCancelSubscription = () => createPortalSession("subscription_cancel");

  const getFormattedPrice = () => {
    if (!currentPlanDetails) return "$0/month";
    return `${currentPlanDetails.price}/${currentPlanDetails.interval === "year" ? "year" : "month"}`;
  };

  const formatRenewalDate = () => {
    if (!activeSubscription?.currentPeriodEnd) return "N/A";
    const formattedDate = formatDate(activeSubscription.currentPeriodEnd);

    if (activeSubscription.cancelAtPeriodEnd) {
      return `Cancels on ${formattedDate}`;
    }
    if (activeSubscription.status === "active") {
      return isAnnualPlan ? `Renews annually on ${formattedDate}` : `Renews monthly on ${formattedDate}`;
    }
    return `Status: ${activeSubscription.status}, ends/renews ${formattedDate}`;
  };

  if (!activeSubscription) {
    return null;
  }

  return (
    <div className="space-y-6">
      {actionError && <Alert variant="destructive">{actionError}</Alert>}
      <PlanDialog
        open={showPlanDialog}
        onOpenChange={setShowPlanDialog}
        currentPlanName={activeSubscription?.planName}
        hasActiveSubscription={!!activeSubscription}
      />
      <Card>
        <CardContent>
          <div className="space-y-6 mt-3 p-2">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-3xl font-bold">{currentPlanDetails?.name || activeSubscription.planName} </p>
                <p className="text text-neutral-600 dark:text-neutral-300">
                  {getFormattedPrice()} • {activeSubscription.eventLimit.toLocaleString()} events
                </p>
                {isAnnualPlan && (
                  <div className="mt-2 text-sm text-emerald-400">
                    <p>You save by paying annually (2 months free)</p>
                  </div>
                )}
                <p className="text-neutral-400 text-sm">{formatRenewalDate()}</p>
              </div>
              <div className="space-x-2">
                <Button variant="success" onClick={handleChangePlan}>
                  Change Plan
                </Button>
                <Button variant="outline" onClick={handleViewSubscription} disabled={isProcessing}>
                  View Details
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium mb-2">Usage this month</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Events</span>
                    <span className="text-sm">
                      {currentUsage.toLocaleString()} / {eventLimit.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={usagePercentage} />
                </div>

                {currentUsage >= eventLimit && (
                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        <strong>Usage limit reached!</strong> You've exceeded your plan's event limit.
                      </p>
                      <Button variant="success" size="sm" onClick={handleChangePlan}>
                        Upgrade Plan
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {organizationId && <UsageChart organizationId={organizationId} startDate={startDate} endDate={endDate} />}

            {isAnnualPlan && (
              <div className="pt-2 pb-0 px-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-md border border-emerald-100 dark:border-emerald-800">
                <p className="text-sm text-emerald-700 dark:text-emerald-300 py-2">
                  <strong>Annual Billing:</strong> You're on annual billing which saves you money compared to monthly
                  billing. Your subscription will renew once per year on{" "}
                  {formatDate(activeSubscription.currentPeriodEnd)}.
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <Button
                variant="ghost"
                onClick={handleCancelSubscription}
                disabled={isProcessing}
                size="sm"
                className="dark:hover:bg-red-700/60"
              >
                Cancel Subscription
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
