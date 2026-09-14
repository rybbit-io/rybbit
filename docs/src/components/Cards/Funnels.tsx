import { ArrowDown, Eye, Filter, Zap } from "lucide-react";
import { useExtracted } from "next-intl";
import { Card } from "./Card";
import { DemoFrame } from "./DemoFrame";

// Page steps carry the periwinkle data hue; the conversion step is emerald.
const STEPS = [
  {
    icon: Eye,
    iconClassName: "text-blue-600 dark:text-blue-400",
    label: "/",
    count: "8,412",
    percent: 100,
    dropoff: null,
  },
  {
    icon: Eye,
    iconClassName: "text-blue-600 dark:text-blue-400",
    label: "/pricing",
    count: "5,215",
    percent: 62,
    dropoff: "38.0%",
  },
  {
    icon: Zap,
    iconClassName: "text-amber-600 dark:text-amber-400",
    label: "signup",
    count: "2,356",
    percent: 28,
    dropoff: "54.8%",
  },
  {
    icon: Zap,
    iconClassName: "text-amber-600 dark:text-amber-400",
    label: "purchase",
    count: "925",
    percent: 11,
    dropoff: "60.7%",
    conversion: true,
  },
];

export function Funnels() {
  const t = useExtracted();

  return (
    <Card
      title={t("Conversion Funnels")}
      description={t("Define the steps that matter, then see exactly where visitors drop off on the way to converting.")}
      icon={Filter}
    >
      <DemoFrame label="funnels · onboarding" right={<span className="font-mono">30d</span>}>
        <div className="p-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.label}>
                {step.dropoff && (
                  <div className="flex items-center gap-1 py-1.5 pl-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                    <ArrowDown className="size-3" aria-hidden="true" />
                    <span className="font-mono tabular-nums">−{step.dropoff}</span>
                  </div>
                )}
                <div className="mb-1.5 flex items-center gap-2">
                  <Icon size={14} className={`shrink-0 ${step.iconClassName}`} aria-hidden="true" />
                  <span className="truncate font-mono text-xs text-neutral-800 dark:text-neutral-200">{step.label}</span>
                  <span className="ml-auto shrink-0 font-mono text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                    {step.count}
                  </span>
                  <span
                    className={`w-12 shrink-0 text-right font-mono text-xs font-medium tabular-nums ${
                      step.conversion
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    {step.percent}%
                  </span>
                </div>
                <div className="h-6 overflow-hidden rounded bg-neutral-100 dark:bg-neutral-800/60">
                  <div
                    className={`demo-bar h-full rounded ${
                      step.conversion ? "bg-emerald-600 dark:bg-emerald-500" : "bg-[var(--dataviz)]"
                    }`}
                    style={{ width: `${step.percent}%`, animationDelay: `${index * 120}ms` }}
                  />
                </div>
              </div>
            );
          })}

          <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-3 text-xs dark:border-neutral-800">
            <span className="text-neutral-500 dark:text-neutral-400">{t("End-to-end conversion")}</span>
            <span className="font-mono font-medium tabular-nums text-emerald-700 dark:text-emerald-400">11.0%</span>
          </div>
        </div>
      </DemoFrame>
    </Card>
  );
}
