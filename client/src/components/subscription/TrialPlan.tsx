import { ArrowRight, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { TRIAL_EVENT_LIMIT } from "../../lib/subscription/constants";
import { formatDate } from "../../lib/subscription/planUtils";
import { useStripeSubscription } from "../../lib/subscription/useStripeSubscription";

export function TrialPlan() {
  const { data: activeSubscription, isLoading, error: subscriptionError } = useStripeSubscription();

  const router = useRouter();

  if (!activeSubscription) return null;

  const currentUsage = activeSubscription?.monthlyEventCount || 0;
  const daysRemaining = activeSubscription?.trialDaysRemaining || 0;
  const trialEndDate = activeSubscription?.currentPeriodEnd ? new Date(activeSubscription.currentPeriodEnd) : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            Trial Plan <Clock className="ml-2 h-5 w-5 text-blue-500" />
          </CardTitle>
          <CardDescription>You are currently on a 14-day free trial with up to 1,000,000 events.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6 p-2">
            <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <Clock className="h-4 w-4 text-blue-500 dark:text-blue-400" />
              <AlertTitle>Trial Status</AlertTitle>
              <AlertDescription>
                {daysRemaining > 0 ? (
                  <>
                    Your trial ends in <strong>{daysRemaining} days</strong>
                    {trialEndDate && <> on {formatDate(trialEndDate)}</>}
                  </>
                ) : (
                  <>Your trial ends today. Subscribe to continue tracking visits again.</>
                )}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h3 className="font-medium mb-2">Usage</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Events</span>
                    <span className="text-sm">
                      {currentUsage.toLocaleString()} / {TRIAL_EVENT_LIMIT.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={Math.min((currentUsage / TRIAL_EVENT_LIMIT) * 100, 100)} />
                </div>
              </div>
            </div>
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
