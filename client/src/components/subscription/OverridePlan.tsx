import { authClient } from "@/lib/auth";
import { AlertTriangle, Shield } from "lucide-react";
import { DateTime } from "luxon";
import { DEFAULT_EVENT_LIMIT } from "../../lib/subscription/constants";
import { useStripeSubscription } from "../../lib/subscription/useStripeSubscription";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { UsageChart } from "../UsageChart";

export function OverridePlan() {
  const { data: subscription } = useStripeSubscription();
  const { data: activeOrg } = authClient.useActiveOrganization();

  const organizationId = activeOrg?.id;

  const endDate = DateTime.now().toISODate();
  const startDate = DateTime.now().minus({ days: 30 }).toISODate();

  if (!subscription) return null;

  const currentUsage = subscription?.monthlyEventCount || 0;
  const limit = subscription?.eventLimit || DEFAULT_EVENT_LIMIT;

  const percentageUsed = Math.min((currentUsage / limit) * 100, 100);
  const isNearLimit = percentageUsed > 80;
  const isLimitExceeded = currentUsage >= limit;

  const formatPlanName = (name: string) => {
    const isPro = name.includes("pro");
    const eventMatch = name.match(/(\d+)(k|m)/i);
    if (!eventMatch) return name;

    const num = parseInt(eventMatch[1]);
    const unit = eventMatch[2].toLowerCase();
    const events = unit === "m" ? `${num}M` : `${num}K`;

    return `${isPro ? "Pro" : "Standard"} ${events}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {formatPlanName(subscription.planName)} Plan
          </CardTitle>
          <CardDescription>
            You have a custom plan with up to {subscription?.eventLimit.toLocaleString()} pageviews per month.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {isLimitExceeded ? (
              <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
                <AlertTitle>Event Limit Exceeded</AlertTitle>
                <AlertDescription>
                  You have exceeded your monthly event limit. Please contact support for assistance.
                </AlertDescription>
              </Alert>
            ) : (
              isNearLimit && (
                <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                  <AlertTitle>Approaching Limit</AlertTitle>
                  <AlertDescription>
                    You are approaching your monthly event limit. Please contact support if you need more capacity.
                  </AlertDescription>
                </Alert>
              )
            )}

            <div className="space-y-2">
              <h3 className="font-medium mb-2">Usage</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Events</span>
                    <span className="text-sm">
                      {currentUsage.toLocaleString()} / {limit.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={percentageUsed} className={isNearLimit ? "bg-amber-100 dark:bg-amber-900" : ""} />
                </div>
              </div>
            </div>

            {organizationId && <UsageChart organizationId={organizationId} startDate={startDate} endDate={endDate} />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
