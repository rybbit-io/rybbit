import { useExtracted } from "next-intl";
import { Progress } from "../../ui/progress";

interface UsageProgressBarProps {
  currentUsage: number;
  limit: number;
  percentageUsed: number;
  isNearLimit: boolean;
}

export function UsageProgressBar({ currentUsage, limit, percentageUsed, isNearLimit }: UsageProgressBarProps) {
  const t = useExtracted();

  return (
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
  );
}
