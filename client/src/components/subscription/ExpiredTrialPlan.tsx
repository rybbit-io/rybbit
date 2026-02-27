import { AlertTriangle, ArrowRight } from "lucide-react";
import { useExtracted } from "next-intl";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";

interface ExpiredTrialPlanProps {
  message?: string;
}

export function ExpiredTrialPlan({ message }: ExpiredTrialPlanProps) {
  const t = useExtracted();
  const router = useRouter();

  const defaultMessage = t("Your 14-day free trial has ended. You need to subscribe to continue tracking visits again.");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("Trial Expired")}</CardTitle>
          <CardDescription>
            {t("Your free trial has expired. Subscribe to a plan to continue tracking visits again.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
              <AlertTitle>{t("Subscription Required")}</AlertTitle>
              <AlertDescription>{message || defaultMessage}</AlertDescription>
            </Alert>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={() => router.push("/subscribe")} variant={"success"}>
            {t("Subscribe Now")} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
