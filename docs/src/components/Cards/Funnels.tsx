import { Card, CardViewport } from "./Card";
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
      <CardViewport className="flex flex-col justify-center gap-6 p-6">
        {funnelData.map(item => {
          const overallConversion = (item.users / totalUsers) * 100;

          return (
            <div key={item.step}>
              {/* Label and counts */}
              <div className="flex items-center gap-2 mb-1.5">
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-sm font-medium">{item.label}</span>
                <span className="ml-auto text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
                  {item.users.toLocaleString()} · {overallConversion.toFixed(overallConversion === 100 ? 0 : 2)}%
                </span>
              </div>

              <div className="h-7 rounded-sm bg-neutral-100 dark:bg-neutral-800">
                <div
                  className="h-7 rounded-sm bg-emerald-600"
                  style={{ width: `${Math.max(overallConversion, 2)}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardViewport>
    </Card>
  );
}
