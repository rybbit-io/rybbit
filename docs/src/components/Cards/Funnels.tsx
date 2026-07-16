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
      <div className="space-y-4 mt-4 transform -rotate-2 translate-x-8 translate-y-8 bg-neutral-100/50 dark:bg-neutral-800/20 border border-neutral-300/50 dark:border-neutral-800/50 pb-20 rounded-lg p-4 -mb-[40px] transition-transform duration-300 hover:scale-105 hover:-rotate-1">
        {funnelData.map((item, index) => {
          const overallConversion = (item.users / totalUsers) * 100;
          const previousUsers = index > 0 ? funnelData[index - 1].users : item.users;

          return (
            <div key={item.step} className="flex items-center gap-3">
              {/* Step number */}
              <div className="flex-shrink-0 w-8 h-8 mt-7 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300/70 dark:border-neutral-800/70 rounded-full flex items-center justify-center text-xs">
                {item.step}
              </div>

              {/* Step info and bars */}
              <div className="flex-1">
                {/* Label and counts */}
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>

                <div className="h-8 bg-neutral-200 dark:bg-neutral-800 relative">
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
