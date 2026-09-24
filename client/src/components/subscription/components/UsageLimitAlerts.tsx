import { AlertTriangle } from "lucide-react";
import { useExtracted } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";

interface UsageLimitAlertsProps {
  isLimitExceeded: boolean;
  isNearLimit: boolean;
  exceededMessage?: string;
  nearLimitMessage?: string;
}

export function UsageLimitAlerts({
  isLimitExceeded,
  isNearLimit,
  exceededMessage,
  nearLimitMessage,
}: UsageLimitAlertsProps) {
  const t = useExtracted();

  if (isLimitExceeded) {
    return (
      <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
        <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
        <AlertTitle>{t("Event Limit Exceeded")}</AlertTitle>
        <AlertDescription>
          {exceededMessage ||
            t("You have exceeded your monthly event limit. Please upgrade to a Pro plan to continue collecting analytics.")}
        </AlertDescription>
      </Alert>
    );
  }

  if (isNearLimit) {
    return (
      <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
        <AlertTitle>{t("Approaching Limit")}</AlertTitle>
        <AlertDescription>
          {nearLimitMessage ||
            t("You are approaching your monthly event limit. Consider upgrading to a paid plan for higher limits.")}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
