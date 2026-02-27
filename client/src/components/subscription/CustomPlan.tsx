import { authClient } from "@/lib/auth";
import { AlertTriangle, Sparkles } from "lucide-react";
import { useExtracted } from "next-intl";
import { DEFAULT_EVENT_LIMIT } from "../../lib/subscription/constants";
import { useStripeSubscription } from "../../lib/subscription/useStripeSubscription";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { UsageChart } from "../UsageChart";

export function CustomPlan() {
  const t = useExtracted();
  const { data: subscription } = useStripeSubscription();
  const { data: activeOrg } = authClient.useActiveOrganization();

  const organizationId = activeOrg?.id;

  if (!subscription) return null;

  const currentUsage = subscription?.monthlyEventCount || 0;
  const limit = subscription?.eventLimit || DEFAULT_EVENT_LIMIT;

  const percentageUsed = Math.min((currentUsage / limit) * 100, 100);
  const isNearLimit = percentageUsed > 80;
  const isLimitExceeded = currentUsage >= limit;

  const formatLimit = (value: number | null) => (value === null ? "Unlimited" : value.toLocaleString());

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {t("Custom Plan")}
          </CardTitle>
          <CardDescription>
            {t("You have a custom plan with up to {limit} pageviews per month.", {
              limit: limit.toLocaleString(),
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {isLimitExceeded ? (
              <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
                <AlertTitle>{t("Event Limit Exceeded")}</AlertTitle>
                <AlertDescription>
                  {t("You have exceeded your monthly event limit. Please contact support for assistance.")}
                </AlertDescription>
              </Alert>
            ) : (
              isNearLimit && (
                <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                  <AlertTitle>{t("Approaching Limit")}</AlertTitle>
                  <AlertDescription>
                    {t(
                      "You are approaching your monthly event limit. Please contact support if you need more capacity."
                    )}
                  </AlertDescription>
                </Alert>
              )
            )}

            <div className="space-y-2">
              <h3 className="font-medium mb-2">{t("Usage")}</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">{t("Events")}</span>
                    <span className="text-sm">
                      {currentUsage.toLocaleString()} / {limit.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={percentageUsed} className={isNearLimit ? "bg-amber-100 dark:bg-amber-900" : ""} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium mb-2">{t("Plan Limits")}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-3">
                  <div className="text-sm text-muted-foreground">{t("Websites")}</div>
                  <div className="text-lg font-semibold">{formatLimit(subscription.siteLimit)}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-sm text-muted-foreground">{t("Team Members")}</div>
                  <div className="text-lg font-semibold">{formatLimit(subscription.memberLimit)}</div>
                </div>
              </div>
            </div>

            {organizationId && <UsageChart organizationId={organizationId} />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
