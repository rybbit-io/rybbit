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
      <div className="mt-6 space-y-4 overflow-hidden rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
        {funnelData.map(item => {
          const overallConversion = (item.users / totalUsers) * 100;
          return (
            <div key={item.step} className="flex items-center gap-3">
              {/* Step number */}
              <div className="mt-7 flex size-8 shrink-0 items-center justify-center rounded-md border border-neutral-300 bg-neutral-50 text-xs dark:border-neutral-700 dark:bg-neutral-900">
                {item.step}
              </div>

              {/* Step info and bars */}
              <div className="flex-1">
                {/* Label and counts */}
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>

                <div className="relative h-8 overflow-hidden rounded-sm bg-neutral-200 dark:bg-neutral-800">
                  <div
                    className="h-8 bg-emerald-600 rounded flex items-center justify-end pr-3"
                    style={{ width: `${overallConversion}%` }}
                  />
                  <div className="absolute top-2 right-1.5 text-right text-xs">
                    {overallConversion.toFixed(overallConversion === 100 ? 0 : 2)}%
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
