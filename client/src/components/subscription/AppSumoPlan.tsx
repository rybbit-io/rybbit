import { authClient } from "@/lib/auth";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { DateTime } from "luxon";
import { useRouter } from "next/navigation";
import { DEFAULT_EVENT_LIMIT } from "../../lib/subscription/constants";
import { useStripeSubscription } from "../../lib/subscription/useStripeSubscription";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { UsageChart } from "../UsageChart";

export function AppSumoPlan() {
  const { data: subscription } = useStripeSubscription();
  const { data: activeOrg } = authClient.useActiveOrganization();
  const router = useRouter();

  // Get the active organization ID
  const organizationId = activeOrg?.id;

  // Get last 30 days of data for the chart
  const endDate = DateTime.now().toISODate();
  const startDate = DateTime.now().minus({ days: 30 }).toISODate();

  if (!subscription) return null;

  const currentUsage = subscription?.monthlyEventCount || 0;
  const limit = subscription?.eventLimit || DEFAULT_EVENT_LIMIT;

  // Calculate percentage of limit used
  const percentageUsed = Math.min((currentUsage / limit) * 100, 100);
  const isNearLimit = percentageUsed > 80;
  const isLimitExceeded = currentUsage >= limit;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">AppSumo Plan Tier {subscription.planName.split("-")[1]}</CardTitle>
          <CardDescription>
            You are on the AppSumo lifetime plan with up to {subscription?.eventLimit.toLocaleString()} events per
            month.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {isLimitExceeded ? (
              <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
                <AlertTitle>Event Limit Exceeded</AlertTitle>
                <AlertDescription>
                  You have exceeded your monthly event limit. Please upgrade to a Pro plan to continue collecting
                  analytics.
                </AlertDescription>
              </Alert>
            ) : (
              isNearLimit && (
                <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                  <AlertTitle>Approaching Limit</AlertTitle>
                  <AlertDescription>
                    You are approaching your monthly event limit. Consider upgrading to a paid plan for higher limits.
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
        <CardFooter>
          <Button onClick={() => router.push("/subscribe")} variant={"success"}>
            Upgrade To Pro <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
