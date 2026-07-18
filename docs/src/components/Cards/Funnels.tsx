import { Card } from "./Card";
import { Eye, Filter } from "lucide-react";
import { useExtracted } from "next-intl";

const funnelUsers = [608, 59, 5];

export function Funnels() {
  const t = useExtracted();
  const funnelData = [
    { step: 1, label: t("Homepage"), users: funnelUsers[0] },
    { step: 2, label: t("Signup"), users: funnelUsers[1] },
    { step: 3, label: t("Purchase"), users: funnelUsers[2] },
  ];
  const totalUsers = funnelUsers[0];

  return (
    <Card
      title={t("Conversion Funnels")}
      description={t("Visualize user journeys and identify where users drop off.")}
      icon={Filter}
    >
      {/* Funnel Steps */}
      <div className="mt-5 flex-1 min-h-[300px] overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60 p-4">
        <div className="flex h-full flex-col justify-center gap-6">
          {funnelData.map(item => {
            const overallConversion = (item.users / totalUsers) * 100;

            return (
              <div key={item.step} className="flex items-center gap-3">
                {/* Step number */}
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs text-neutral-600 dark:text-neutral-300">
                  {item.step}
                </div>

                {/* Step info and bar */}
                <div className="flex-1">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Eye className="w-4 h-4 text-blue-400" />
                      {item.label}
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
                      {item.users.toLocaleString()} ·{" "}
                      {overallConversion.toFixed(overallConversion === 100 ? 0 : 2)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.max(overallConversion, 2)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
